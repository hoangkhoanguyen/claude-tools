---
description: Run an entire sprint with a single command — analyze, design, tasks, execute, test — and resume. If interrupted, re-run the same command to continue from exactly where it stopped.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:run

The main command. Runs the full lifecycle for ONE sprint and saves state so it can resume.

## Input

- `$1`: version slug (e.g. `v1`, `v2`). If empty, read `.sdlc/versions.md` for the active version.
- `$2`: sprint slug (e.g. `sprint-1-auth`). If empty, read `.sdlc/<version>/state.md` for the in-progress
  sprint, or ask the user.

Every output file in this command lives under `.sdlc/<version>/`.

## Model policy (read first, affects the whole command)

This command should run on **Opus** — it holds every decision in the sprint (approval gates, handling
`DESIGN_GAP`, confirming scope) and must survive all 6 phases. If the session is on a different model,
just carry on; don't stop to demand a model change.

Each subagent's model is **already declared in that agent's own frontmatter** (`agents/*.md`) — do NOT
pass a `model` parameter when spawning, so you don't override the policy:

| Agent | Model | Why |
|---|---|---|
| `product-analyst`, `architect`, `ui-designer`, `reviewer` | `inherit` | Phases 1-3 are where one mistake cascades into every later phase → run the model the user chose (`architect` now writes `design.md` AND `tasks.md` in one pass) |
| `preflight-scout`, `implement-coordinator`, `feature-builder`, `test-strategist`, `qa-guard` | sonnet | Phases 4-6 are repetitive work with a clear spec in hand — hard-pinned to lower the model regardless of the main session. The scout also runs early (`services` mode, STEP 0) and once more (`migration` mode) before Execute; `feature-builder` is dispatched per batch of tasks, `test-strategist` per test layer |

**Escalating to Opus is the execution agent's job, not yours.** `implement-coordinator`,
`test-strategist`, and `qa-guard` promote `feature-builder` to Opus once Sonnet has failed 5 rounds at
the same spot (details in each agent file). The retry budget is unchanged by batching/layering. You only receive the status on the report's first line. Don't
respawn an agent with Opus just because it returned `BLOCKED` — the escalation budget was spent before
that status reached you; `BLOCKED` means a human decision is needed, not a bigger model.

The only case where you may pass `model` when spawning: the user explicitly says so in their command
(e.g. "run this whole sprint on Opus to be safe").

## STEP 0 — Resume + dependency check (ALWAYS do this first)

**Do NOT load CLAUDE.md / architecture.md here.** From phase 1 on, each subagent loads what's relevant to
it, cold-start. The main conversation only holds state + the Human Review blocks it relays to the user —
the "context discipline" principle applies throughout, not just from phase 4.

1. **Dependency check**: read `.sdlc/<version>/sprints.md`. If this sprint depends on another sprint that
   is NOT yet `done` → WARN the user and stop, suggesting they run the dependency first (unless the user
   asks to proceed anyway). If it depends on a sprint from a previous version, read
   `.sdlc/<previous-version>/sprints.md` to confirm.
2. **Resume check**: read `.sdlc/<version>/state.md` (per the `templates/state.template.md` schema) +
   `.sdlc/<version>/<sprint>/`. Identify the in-progress phase & task. **Skip** every phase/task already
   done. First run → start from analyze.
   - **Approval gate not yet passed**: a phase can be `done` while its approval is still `pending`
     (interrupted right at the gate). Before moving to the next phase, check: `analyze: done` with
     `analyze_approved: pending`, `design_system` + `design_ui` complete with `design_approved: pending`,
     or `tasks: done` with `tasks_approved: pending` → **re-present that exact gate and wait for user
     approval**, do NOT jump ahead. Only proceed when approval is `true`.
   - **If `design_ui: waiting-external`**: check whether `.sdlc/<version>/<sprint>/ui-design.input.md` has
     arrived. YES → ingest + normalize, set design_ui to done. NOT YET → restate the blocker and stop.
3. **Early services check (ONCE per sprint, F1)**: unless `state.md` already records `services_up` and
   `codex_enabled` for this sprint, spawn `preflight-scout` with `mode: services` **in the SAME turn as the
   first phase-1 agent (`product-analyst`)** — spawn both together, in parallel. The scout reads only
   config (no `design.md` exists yet, so no migration detection) and returns services + ports + status +
   start commands (for implement, test AND qa) + codex availability. When it returns, ask the user ONE
   consolidated question: which "not running" services to start (with the commands it gave) and — only if
   `codex: found, authenticated` — "Codex CLI is available. Offload `Difficulty: normal` implement tasks
   to it (fallback to Claude on failure) to save your Claude usage? [yes/no]". Wait for "ok", then write
   `services_up` and `codex_enabled: true|false` (silently `false` if codex is not found/authenticated)
   into `state.md`. Goal: the user answers this once, at the start, then can walk away through the
   later phases. Do not Read the config yourself.

## Run the phases in sequence (skip phases already done)

### Phase 1 — Analyze
Spawn `product-analyst` (skill `requirements-analysis`). It loads CLAUDE.md + architecture.md + the
business docs itself, runs `self-review` itself, writes `.sdlc/<version>/<sprint>/requirements.md`
(including NFR + Regression impact for an existing codebase), and returns a ready Human Review block to
relay. **You do not Read the file back** — use the block the agent returned. Open Questions you cannot
resolve safely → ask the user.
**→ Reviewer gate**: spawn `reviewer` (it reads the file itself). `NEEDS_FIX` → fix then review again;
only `PASS` moves on.

**→ Human approval gate (REQUIRED)**: Present a summary of the "Human Review" section of
`requirements.md` to the user, then **STOP and ask whether they approve** before running Design. Example:

> ✅ Analyze complete. Requirements summary:
> - [short list of user stories / main scope]
> - [number of AC, number of edge cases, notable NFRs]
>
> Reply **"ok"** or **"approve"** to continue to Design, or give feedback to adjust the requirements first.

Only continue to phase 2 once the user confirms. Write `analyze_approved: true` into
`.sdlc/<version>/state.md`.

### Phase 2 — Design + Tasks (planning)
Planning depends on whether the sprint has screens (decide from `requirements.md`'s UI scope — the
`ui-designer` reports `design_ui: n/a` when there are none). Agents load
CLAUDE.md/architecture.md/requirements.md cold — you do NOT read for them.

- **Sprint has NO screens (`design_ui: n/a`) → one architect pass, "design + tasks" mode**: spawn
  `architect` (skills `system-design` + `task-breakdown`) → writes `design.md` AND `tasks.md` (status todo)
  in the same invocation; `tasks.md` includes the Test Plan, `Batch`, `Tests:` and the tightened
  `Difficulty` fields. It updates `.sdlc/architecture.md` if foundational components change, and returns
  (a) the design Human Review block and (b) a task ID + short description list (+ batches). No separate
  task-breakdown spawn.
- **Sprint HAS screens → architect runs design-only, in parallel with `ui-designer`** (as before): the
  `architect` (skill `system-design`) writes `design.md` only and does NOT wait for the UI design. Tasks
  must see `ui-design.md` (so they carry the DAC-xx items), so they are written afterwards: once BOTH
  branches are done and the sync condition below holds, spawn ONE `task-breakdown` subagent (skill
  `task-breakdown`) that reads `design.md` + `ui-design.md` and writes `tasks.md` (Test Plan, Batch, Tests,
  DAC, tightened Difficulty) and returns the ID/description list.
- **UI** (only when the sprint has screens): spawn `ui-designer` (skill `design-fidelity` + `artifact-design`) in parallel. It examines the UI
  scope in `requirements.md`, picking a design source per screen:
  - Requirements have **no screens** → `design_ui: n/a`, skip the branch.
  - Requirements **have screens** → `ui-design.md` must cover every screen/state:
    - Screen present in the external design `.sdlc/<version>/<sprint>/ui-design.input.md` → ingest +
      normalize as `[external]`.
    - Screen not provided → generate as `[generated]`, source priority: external tokens →
      `.sdlc/design-system.md` → DESIGN.md → existing project: the current app's style → new project with
      no source: ask the user once.
  Writes `.sdlc/<version>/<sprint>/ui-design.md`; updates `.sdlc/design-system.md`.

**Sync before Tasks (sprints with screens)**: only spawn the task-breakdown subagent once the UI branch
has a complete `ui-design.md` (not `waiting-external`). No-UI sprints have nothing to wait for.

Write `design_system: done`, `design_ui: ...`, `tasks: done` into `state.md` after the agents return.
Also generate `.sdlc/<version>/<sprint>/commands.md` (same as `/sdlc:tasks`): listing the per-task command
`/sdlc:task <version> <sprint> <task-id>` and the run-to-completion command
`/sdlc:execute <version> <sprint>` (implement + test + qa) — so the user can run or redo them manually later.
Sync TodoWrite from the returned ID list (do NOT Read all of `tasks.md`).

Self-review: each agent runs it before returning the file (you don't run it for them).
**→ Reviewer gate** (after `tasks.md` exists): spawn `reviewer` to check `design.md` (+ `ui-design.md`) against `requirements.md`,
and `tasks.md` (every AC/EC/NFR/DAC has an owning task or a `test-leg` item in the Test Plan) — it reads
them itself. Only `PASS` moves on; `NEEDS_FIX` → the `architect` fixes (design and/or tasks), then review again.

**→ Human approval gates (REQUIRED, two gates presented back-to-back — no agent spawn between them).**

*Design gate.* Present a summary of the "Human Review" section of `design.md` (and `ui-design.md` if
present), then **STOP and ask whether they approve**. Example:

> ✅ Design complete. Summary:
> - [architecture, main data model, notable API contracts]
> - [UI screens / design tokens if any]
> - [Regression-safe plan / breaking changes if any]
>
> Reply **"ok"** or **"approve"** to continue to the task list, or give feedback to adjust the design first.

On "ok": write `design_approved: true`, then immediately present the tasks gate (the architect already
wrote `tasks.md`, or the task-breakdown subagent did; use the ID/description list returned). On design
feedback: spawn `architect` to revise `design.md`, then **regenerate `tasks.md`** (tasks derive from the
design — architect in design+tasks mode for no-UI sprints, a fresh task-breakdown subagent for sprints with
screens), then re-run the reviewer and
re-present the design gate.

*Tasks gate.* Present a summary of `tasks.md`, then **STOP and ask whether they approve** before running
Execute. Example:

> ✅ Tasks complete. Summary:
> - [task count, batches, short list of each task with the AC it serves]
> - [which batches run in parallel, notable dependency ordering; the Test Plan split unit/api vs test-leg]
>
> Reply **"ok"** to let `/sdlc:run` continue to completion (implement + test + qa). Or stop here and run
> it yourself: `/sdlc:execute` (run to completion) / `/sdlc:task` (one task at a time, manually).

Only continue to phase 4 once the user confirms. Write `tasks_approved: true` into
`.sdlc/<version>/state.md`. Tasks feedback → `architect`/task-breakdown revises `tasks.md` only.

(In no-UI sprints there is no separate task-breakdown spawn in `/sdlc:run`; in sprints with screens there is
exactly one, after design + UI design. Standalone `/sdlc:tasks` still spawns a task-breakdown subagent for
regeneration/replan.)

### Phase 4 — Execute (the most important one)

**4a. Pre-flight (REQUIRED before writing code):**
From here to the end of phase 6, your context must be as lean as possible — it already carries analyze +
design + tasks. Every execution agent loads `CLAUDE.md`/`design.md`/the repo's skills itself at startup,
so **don't read them on their behalf**.

Services and Codex were already confirmed at STEP 0 (`services_up`, `codex_enabled` are in `state.md`), so
there is no full pre-flight here — only a cheap migration re-check:

- **Spawn `preflight-scout` with `mode: migration`** (read-only, cheap): it reads the File Change Plan in
  `design.md` and reports (a) whether this sprint changes the schema + the migrate command, and (b) any
  service newly needed that is not in `services_up` (rare — pass it the confirmed list).
- Schema changes → run the migrate command it provided (after the DB is up). Record it in state.
- A newly needed service (rare) → ask the user to start it now, wait for "ok", add it to `services_up`.
- If `services_up` / `codex_enabled` are missing from state (e.g. an old run), run the scout in `full`
  mode and ask as `/sdlc:execute` does.
- Write the result (`services_up`, migration run) into `.sdlc/<version>/state.md` — this is the **last
  time** you write this file in the sprint.

**4b. Implement — hand off entirely to `implement-coordinator`:**
Do NOT orchestrate individual tasks in this conversation (context must still cover phases 5 + 6).
Sync TodoWrite once (get IDs + descriptions with a targeted Grep into `tasks.md`, don't Read the whole
file — each task has 7 fields and you need 2), then spawn subagent `implement-coordinator`, passing
`version`, `sprint`, the sprint branch name, the confirmed `services_up`, and `codex_enabled`. It splits
into waves by dependency → assigns each task to `feature-builder` or, if `codex_enabled` and the task
qualifies, to Codex CLI (independent tasks in parallel) → commits each task → writes `tasks.md` +
`state.md`. The coordinator dispatches one `feature-builder` per **batch** (`Batch: B<n>` in `tasks.md`, at
most 4 tasks, a `Difficulty: high` task is its own batch) but still commits per task. It does not run
repo-wide test/typecheck/lint — that belongs to the Test leg and QA.

**While it runs, do NOT touch `tasks.md` / `state.md` / the git index** — it is the sole writer.

Handle the status it returns: `DONE` → phase 5. `BLOCKED` → stop, report to the user. `DESIGN_GAP` →
**you decide, `architect` writes**: for a small, clear gap spawn `architect` with the gap description to
patch `design.md` (don't read `design.md` yourself to edit it); for a large gap suggest `/sdlc:replan`;
then spawn a fresh coordinator. `NEEDS_SERVICE` → ask the user to start it, wait for "ok", respawn.
`CONTEXT_LIMIT` → spawn a fresh coordinator to continue (progress is already on disk).
Relay the report to the user as a short summary.

### Phase 5 — Test (by layer)
Spawn `test-strategist` (skill `test-strategy`) once **per layer**, sequentially, each
with a fresh and smaller context — pass `version`, `sprint`, `layer`:
- Sprint has **UI and more than 5 tasks** → `integration` first, then `ui`.
  - `integration`: api/integration/3rd-party/webhook/DB-side-effect items + gap-filling of unit/api coverage
    (builders already wrote the unit/api tests from each task's `Tests:`).
  - `ui`: e2e (Playwright) + visual verification (skill `design-fidelity`) — screenshots of each
    screen/state + dark/light, baseline in `.sdlc/<version>/<sprint>/visual-baseline/`.
- **Small sprint (no UI, or ≤ 5 tasks)** → one `all` pass.

Each layer appends/updates ITS section of `.sdlc/<version>/<sprint>/test-report.md`, **closes its own fix
loop (max 5 Sonnet rounds + 1 Opus escalation round) and commits its own test files + fixes** — you do NOT
orchestrate the fix loop and do NOT touch the git index while it runs. It records `test_layers_done` in
`state.md`; the last required layer sets `test: done`. Handle each status as in phase 4b; only move to the
next layer / phase on `DONE`.

### Phase 6 — QA Gate
Spawn `qa-guard`. It chooses its own mode (no new question to the user) and states which ran and why:
- **lite (default)**: clean-code scan of the sprint diff (hardcode/secrets/TODO/debug), regression happy
  path for the "Regression Impact" modules, Definition-of-Done check, and verification that `test-report.md`
  covers every AC/EC/NFR/DAC (spot-checking a few). It does not re-run the full suite when `test-report.md`
  records a green full run at the current HEAD sha.
- **full**: when the sprint touches auth/permissions/payments/PII, OR the Test leg made source (non-test)
  fix commits, OR `test-report.md` has no green full run at HEAD, OR the user asked for full QA — full test
  run + happy path per story + regression + NFR + design fidelity + scan.
**It also closes its own fix loop (max 5 Sonnet rounds + 1 Opus escalation round) and commits itself.**
You only receive the status; only `DONE` moves to handoff.

## Handoff

Set the sprint status to `done` in `.sdlc/<version>/sprints.md`.
If every sprint in the version is `done`, update `.sdlc/versions.md`: this version = `done`.

Present the Pre-manual Report: automatically covered / needs manual verification / undefined edge cases.
Remind the user: next sprint `/sdlc:run <version> <sprint-slug>`; new version `/sdlc:sprint-plan <version>`.

## Context management / checkpoints

- **Phases 1-3 (analyze → design → tasks)**: you update `.sdlc/<version>/state.md` after each phase.
- **Phases 4-6 (execute → test → qa)**: the running agent owns `state.md` and updates it after each task /
  each leg (including `test_layers_done`). **You do NOT write to it anymore** once you've done the
  migration re-check write at pre-flight — two
  writers on one file is a source of corrupted state. You also don't run the `self-review` skill for them:
  each agent has its own REQUIRED self-review section.
- What you may read throughout: `state.md`, `sprints.md`, a targeted Grep of `tasks.md` for IDs/descriptions,
  and the Human Review blocks the agents return. Never the CLAUDE.md files, `design.md`, `requirements.md`,
  the full `tasks.md`, `test-report.md`, or the config the scout reads.
- From phase 4 on you do not `git add`/`commit`/`push`, and you do not edit
  `design.md`/`requirements.md`/`tasks.md`. The only exception: handoff (`sprints.md`, `versions.md`).
- If context is filling up: finish the current task/phase → STOP → tell the user to re-run
  `/sdlc:run <version> <sprint>`.
- Spawn a subagent for every phase to isolate context — including the ones that seem lightweight.

## Optional: pipelining across sprints (opt-in, default OFF)

Default is strictly one sprint at a time. Only when the user **explicitly asks to run several sprints in one
go** AND `sprints.md` shows the later sprint depends on nothing unfinished (no dependency on sprint N, direct
or transitive) may you overlap: sprint N+1's phases 1-3 (analyze / design / tasks) MAY run in the background
(subagents) while sprint N is in Execute/Test/QA. Rules:
- **Never run two sprints' Execute concurrently** (nor Test/QA of two sprints at once) — shared git index,
  state, services.
- If N+1 depends on N in any way → run strictly sequentially.
- Approval gates still apply to N+1's analyze/design/tasks unless the user said "no human gate"; present them
  at a natural pause, not by interrupting sprint N's agents. Keep a separate `state.md` pointer per sprint's
  planning artifacts and do not write `state.md` while sprint N's execution agent is the sole writer — queue
  N+1's state updates until N's leg finishes.
- If anything is ambiguous, do not pipeline; ask or run sequentially.
