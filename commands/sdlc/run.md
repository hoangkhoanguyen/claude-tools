---
description: Run an entire sprint with a single command — analyze, design, tasks, execute, test — and resume. If interrupted, re-run the same command to continue from exactly where it stopped.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:run

The main command. Runs the full lifecycle for ONE sprint and saves state so it can resume.

## Input

- `$1`: version slug (e.g. `v1`, `v2`). If empty, read `.sdlc/versions.md` for the active version.
- `$2`: sprint slug (e.g. `sprint-1-auth`). If empty, read `.sdlc/<version>/state.md` for the in-progress
  sprint, or ask the user. A comma list (`sprint-22,sprint-23,sprint-24`) is a **multi-sprint invocation**
  (see "Multi-sprint invocation" below).

Every output file in this command lives under `.sdlc/<version>/`.

## Model policy

Run this command on **Opus**: it holds every decision (approval gates, `DESIGN_GAP`, scope) across all 6
phases. If the session is on another model, carry on without demanding a change. Do NOT pass `model` when
spawning (each agent's frontmatter sets it) unless the user explicitly asks.

`product-analyst`, `architect`, `task-breakdown`, `ui-designer`, `reviewer` use the model the user chose
(`inherit`: an early mistake cascades into every later phase). `preflight-scout`, `implement-coordinator`,
`feature-builder`, `test-strategist`, `qa-guard` are pinned to Sonnet. Escalating to Opus is the execution
agents' job (skill `failure-ladder`), never yours: `BLOCKED` means a human decision is needed, not a bigger
model, so never respawn with Opus because of it.

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
   - **Check `tasks` BEFORE the gates**: a UI sprint with `design_system` + `design_ui` done (and
     `design_ui` not `waiting-external`) but `tasks: todo` → spawn the `task-breakdown` subagent first
     (tasks.md doesn't exist yet), then run the reviewer and the gates.
   - **Reviewer record**: state keeps `reviewer_passed: [analyze, design, tasks]` (the checks that already
     returned `PASS`). On resume, skip a reviewer check listed there; run one that is missing before its
     gate — don't skip it and don't repeat it.
   - **Approval gate not yet passed**: a phase can be `done` while its approval is still `pending`
     (interrupted right at the gate). Before moving to the next phase, check: `analyze: done` with
     `analyze_approved: pending`, `design_system` + `design_ui` complete with `design_approved: pending`,
     or `tasks: done` with `tasks_approved: pending` → **re-present that exact gate and wait for user
     approval**, do NOT jump ahead. Only proceed when approval is `true`. (Exception: under "no human
     gate", see below.)
   - **If `design_ui: waiting-external`**: check whether `.sdlc/<version>/<sprint>/ui-design.input.md` has
     arrived. YES → ingest + normalize, set design_ui to done. NOT YET → restate the blocker and stop.
3. **Early services check (ONCE per sprint)**: skip it ONLY if `state.md` records `services_up`,
   `codex_enabled` AND `services_up_sprint` equal to THIS sprint's slug. On a different sprint (stale
   `services_up` from the previous one) → reset `services_up`, `test_layers_done`, `required_layers`
   (state-file writes of this early phase are yours), then re-run the check below, asking only about the
   services that are down and **skipping the Codex sentence** (`codex_enabled` is kept for the whole
   invocation). Spawn `preflight-scout` with `mode: services` **in the SAME turn as the first phase-1 agent
   (`product-analyst`)** — both in parallel. The scout reads only config (no `design.md` yet, so no
   migration detection) and returns services + ports + status + start commands (for implement, test AND qa)
   + codex availability. **Ask the user as soon as the scout returns, and do NOT present the analyze gate
   until this is answered** — ONE consolidated question: which "not running" services to start (with the
   commands it gave) and — only if `codex: found, authenticated` — "Codex CLI is available. Offload
   `Difficulty: normal` implement tasks to it (fallback to Claude on failure) to save your Claude usage?
   [yes/no]" (in a multi-sprint invocation add: "applies to every sprint in this run"). **Answer format**:
   `ok` plus an optional `codex: yes|no`; plain `ok` = no (gates are approved with `approve` or `ok`).
   Wait for it, then write `services_up` (`none` explicitly when nothing is needed),
   `services_up_sprint: <sprint>` and `codex_enabled: true|false` (silently `false` if codex is not
   found/authenticated) into `state.md`. Goal: the user answers this once, at the start, then can walk
   away. Do not Read the config yourself.
4. **"No human gate"** (only when the user said so, e.g. "no human gate" / "không cần duyệt"): each gate is
   auto-approved ONCE the `reviewer` has returned `PASS` for it (still write `*_approved: true`). Still STOP
   on: unresolved Open Questions, reviewer `NEEDS_FIX` after one fix round, `BLOCKED` / `DESIGN_GAP`
   statuses. Without that phrase every gate waits for the user.

## Run the phases in sequence (skip phases already done)

### Phase 1 — Analyze
Spawn `product-analyst` (skill `requirements-analysis`). It loads CLAUDE.md + architecture.md + the
business docs itself, runs `self-review` itself, writes `.sdlc/<version>/<sprint>/requirements.md`
(including NFR + Regression impact for an existing codebase), and returns a ready Human Review block to
relay. That block carries a `has_ui: yes|no` line (does the sprint have screens/visual states). **Right
after it returns, write `has_ui`, `analyze: done` and `current_phase` into `state.md`** — you never Read
`requirements.md` for it, and later consumers read `has_ui` from state. (Fallback only if `has_ui` is absent
from state, e.g. an old run: `design_ui` not `n/a`, else `ui-design.md` exists.) **You do not Read the file
back** — use the block the agent returned. Open Questions you cannot resolve safely → ask the user.
**→ Reviewer gate**: spawn `reviewer`, passing the business-doc path (it reads the files itself).
`NEEDS_FIX` → `product-analyst` fixes, remove `analyze` from `reviewer_passed` (any edit to an artifact
removes its entry), review again; only `PASS` moves on (then add `analyze` to `reviewer_passed`).

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
Planning branches on the `has_ui` value from the product-analyst's returned block (Phase 1). Agents load
CLAUDE.md/architecture.md/requirements.md cold — you do NOT read for them.

- **`has_ui: no` → you write `design_ui: n/a` into state yourself (no ui-designer spawn), then one architect
  pass, "design + tasks" mode**: spawn
  `architect` (skills `system-design` + `task-breakdown`) → writes `design.md` AND `tasks.md` (status todo)
  in the same invocation; `tasks.md` includes the Test Plan, `Batch`, `Tests:` and `Difficulty` fields. It updates `.sdlc/architecture.md` if foundational components change, and returns
  (a) the design Human Review block and (b) a task ID + short description list (+ batches). No separate
  task-breakdown spawn.
- **`has_ui: yes` → architect runs design-only, in parallel with `ui-designer`**: the
  `architect` (skill `system-design`) writes `design.md` only and does NOT wait for the UI design. Tasks
  must see `ui-design.md` (so they carry the DAC-xx items), so they are written afterwards: once BOTH
  branches are done and the sync condition below holds, spawn ONE `task-breakdown` subagent (skill
  `task-breakdown`) that reads `design.md` + `ui-design.md` and writes `tasks.md` (Test Plan, Batch, Tests,
  DAC = Design Acceptance Criteria from `ui-design.md`, Difficulty) and returns the ID/description list.
- **UI** (only when `has_ui: yes`): spawn `ui-designer` (skill `design-fidelity` + `artifact-design`) in parallel. It examines the UI
  scope in `requirements.md`, picking a design source per screen; `ui-design.md` must cover every screen/state:
    - Screen present in the external design `.sdlc/<version>/<sprint>/ui-design.input.md` → ingest +
      normalize as `[external]`.
    - Screen not provided → generate as `[generated]`, source priority: external tokens →
      `.sdlc/design-system.md` → DESIGN.md → existing project: the current app's style → new project with
      no source: ask the user once.
  Writes `.sdlc/<version>/<sprint>/ui-design.md`; updates `.sdlc/design-system.md`. Its first report line
  is `DONE`, `NEEDS_INPUT <question>` or `WAITING_EXTERNAL`. **`NEEDS_INPUT`** (subagents cannot talk to the
  user) → relay the question to the user, then respawn `ui-designer` with the answer. **`WAITING_EXTERNAL`**
  → write `design_ui: waiting-external` and stop. On `DONE` it returns a Human Review block (screens, tokens,
  counts of `[external]`/`[generated]`, notable states) to relay at the design gate.

**Sync before Tasks (sprints with screens)**: only spawn the `task-breakdown` subagent once the UI branch
has a complete `ui-design.md` (not `waiting-external`). No-UI sprints have nothing to wait for.

Write `design_system: done`, `design_ui: ...`, `tasks: done` into `state.md` after the agents return.
Also generate `.sdlc/<version>/<sprint>/commands.md` (same as `/sdlc:tasks`): listing the per-task command
`/sdlc:task <version> <sprint> <task-id>` and the run-to-completion command
`/sdlc:execute <version> <sprint>` (implement + test + qa) — so the user can run or redo them manually later.
Sync TodoWrite from the returned ID list (do NOT Read all of `tasks.md`).

Self-review: each agent runs it before returning the file (you don't run it for them).
**→ Reviewer gate** (after `tasks.md` exists): spawn `reviewer` to check `design.md` (+ `ui-design.md`) against `requirements.md`,
and `tasks.md` (every AC/EC/NFR/DAC has an owning task or a Test Plan item owned by `test-strategist`) — it
reads them itself. Only `PASS` moves on (add `design` and `tasks` to `reviewer_passed`). On `NEEDS_FIX`, who
fixes what: design.md → `architect`; ui-design.md → `ui-designer`; tasks.md → the `architect` in a no-UI
sprint, the **`task-breakdown` agent** in a UI sprint. After a design or ui-design fix, **regenerate
`tasks.md`** with the same planner (tasks derive from the design) and remove `design` and `tasks` from
`reviewer_passed` (any edit to an artifact removes its entry); then review again.

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
feedback: first reset `tasks: doing`, `design_approved: pending`, `tasks_approved: pending` (and drop
`design`/`tasks` from `reviewer_passed`); then spawn `architect` to revise `design.md` (or `ui-designer`
when the feedback concerns `ui-design.md`), then **regenerate `tasks.md`** (architect in design+tasks mode
for no-UI sprints, a fresh `task-breakdown` agent for sprints with screens), then re-run the reviewer and
re-present the design gate.

*Tasks gate.* Present a summary of `tasks.md`, then **STOP and ask whether they approve** before running
Execute. Example:

> ✅ Tasks complete. Summary:
> - [task count, batches, short list of each task with the AC it serves]
> - [which batches run in parallel, notable dependency ordering; the Test Plan split: builder-written unit/api tests vs `test-strategist` items]
>
> Reply **"ok"** to let `/sdlc:run` continue to completion (implement + test + qa). Or stop here and run
> it yourself: `/sdlc:execute` (run to completion) / `/sdlc:task` (one task at a time, manually).

Only continue to phase 4 once the user confirms. Write `tasks_approved: true` into
`.sdlc/<version>/state.md`. Tasks feedback → `architect` (no-UI) / the `task-breakdown` agent (UI sprint)
revises `tasks.md` only; remove `tasks` from `reviewer_passed` and re-run the reviewer's tasks check.

(In no-UI sprints `/sdlc:run` never spawns `task-breakdown`; in sprints with screens it spawns it once,
after design + UI design. Standalone `/sdlc:tasks` spawns it for regeneration/replan.)

### Phase 4 — Execute (the most important one)

**4a. Pre-flight (REQUIRED before writing code):**
From here to the end of phase 6, your context must be as lean as possible — it already carries analyze +
design + tasks. Every execution agent loads `CLAUDE.md`/`design.md`/the repo's skills itself at startup,
so **don't read them on their behalf**.

Services and Codex were already confirmed at STEP 0 (`services_up`, `services_up_sprint`, `codex_enabled`
are in `state.md`), so there is no full pre-flight here — only a cheap re-check:

- **Spawn `preflight-scout` with `mode: migration`** (read-only, cheap), passing the **exact `services_up`
  list**. It PINGS every one of them again (time has passed since STEP 0) and reports any now down, reads
  the File Change Plan in `design.md`, and reports (a) whether this sprint changes the schema + the migrate
  command, and (b) the **delta**: services newly required that are not in `services_up` (rare).
- Any service reported down, or newly needed → ask the user to start it now (one consolidated question),
  wait for "ok", update `services_up`.
- Run the migrations that **already exist in the repo** now (migrations this sprint will add are run after
  the coordinator returns `DONE`, see 4b). Record it in state.
- If `services_up` / `services_up_sprint` / `codex_enabled` are missing from state (e.g. an old run), run the
  scout in `full` mode and ask as `/sdlc:execute` does.
- **Sprint branch**: record `sprint_branch` in state = the current branch if it is not the default branch
  (main/master/the repo's default). On the default branch → ask the user once: "on `<branch>`; create
  `sdlc/<version>-<sprint>`? yes/no" (in "no human gate" mode create it automatically). You never switch
  branches otherwise.
- Write the result (`services_up`, `services_up_sprint`, migration run, `sprint_branch`) into
  `.sdlc/<version>/state.md`.
- **Commit the planning artifacts** (no execution agent is running, so you may touch the index):
  `git add .sdlc && git commit -m "docs(<sprint>): planning artifacts"`.

**4b. Implement — hand off entirely to `implement-coordinator`:**
Do NOT orchestrate individual tasks in this conversation (context must still cover phases 5 + 6).
Sync TodoWrite once (get IDs + descriptions with a targeted Grep into `tasks.md`, don't Read the whole
file — grep only the ID + description lines), then spawn subagent `implement-coordinator`, passing
`version`, `sprint`, `sprint_branch`, the confirmed `services_up`, and `codex_enabled`. It splits
into waves by dependency → assigns each **batch** to `feature-builder` or, if `codex_enabled` and the batch
qualifies, to Codex CLI (independent batches in parallel) → commits (per task; one combined commit when
tasks share a file) → writes `tasks.md` + `state.md`. Batching rules and the retry budget live in the
coordinator (skill `failure-ladder`). It does not run repo-wide tests/lint/build — that belongs to the Test
leg and QA (its single whole-repo typecheck per wave is the only exception).

**While it runs, do NOT touch `tasks.md` / `state.md` / the git index** — it is the sole writer.

Handle the status on its first line: `DONE` → run the migrate command again if the sprint added migrations
(scout `migration` output / the design's File Change Plan; record `migration_done` in state), then phase 5.
`BLOCKED` (human decision needed; includes "branch mismatch") → stop, report to the user; after the user
resolves it, re-invoking retries. `DESIGN_GAP` → **you decide, `architect` writes**: for a small, clear gap
spawn `architect` with the gap description to patch `design.md` (don't read `design.md` yourself); the
patch then amends `tasks.md` for UNFINISHED tasks only (done tasks keep ID/Batch/Tests; no gate
re-presentation unless scope changed) and removes `design` from `reviewer_passed`; for a large gap suggest
`/sdlc:replan`; then spawn a fresh coordinator. A `DESIGN_GAP` with reason "tasks.md batching" → spawn the
`task-breakdown` agent by name (regenerate the batches), not `architect`. `NEEDS_SERVICE` → ask the user to
start it, wait for "ok", record `services_up` (+ `services_up_sprint`), then respawn. `CONTEXT_LIMIT` →
spawn a fresh coordinator (progress is on disk). Relay the report to the user as a short summary.

### Phase 5 — Test (by layer)
First **compute `required_layers`** from `has_ui` in `state.md` (`has_ui: yes` →
`[integration, ui]`; `has_ui: no` → `[all]`) and write it into `state.md` (you are the only writer at this
moment — no execution agent is running). Legacy sprint (no Test Plan in `tasks.md`, or an old
`test-report.md` without layer sections) → `[all]`. Then spawn `test-strategist` (skill `test-strategy`)
once per layer in `required_layers` that is **NOT already in `test_layers_done`** (absent field = `[]`),
sequentially, each with a fresh and smaller context — pass `version`, `sprint`, `layer`:
- `has_ui: yes` → `integration` first, then `ui` (regardless of task count).
  - `integration`: api/integration/3rd-party/webhook/DB-side-effect items + gap-filling of unit/api coverage
    (builders already wrote the unit/api tests from each task's `Tests:`).
  - `ui`: e2e (Playwright) + visual verification (skill `design-fidelity`) — screenshots of each
    screen/state + dark/light, baseline in `.sdlc/<version>/<sprint>/visual-baseline/`.
- `has_ui: no` → one `all` pass.

Each layer appends/updates ITS section of `.sdlc/<version>/<sprint>/test-report.md`, **closes its own fix
loop and commits its own test files + fixes** — you do NOT orchestrate the fix loop and do NOT touch the
git index while it runs. It records `test_layers_done` in
`state.md`; the last required layer sets `test: done`. Handle each status as in phase 4b (`NEEDS_SERVICE`
rule included); only move to the next layer / phase on `DONE`. On resume, layers already in
`test_layers_done` are not respawned.

### Phase 6 — QA Gate
Spawn `qa-guard`. It chooses lite or full mode itself, closes its own fix loop and commits itself; its
first report line is `QA mode: lite|full — <reason>`. You only receive the status and relay the report;
only `DONE` moves to handoff.

## Handoff

Set the sprint status to `done` in `.sdlc/<version>/sprints.md`.
If every sprint in the version is `done`, update `.sdlc/versions.md`: this version = `done`.

Present the Pre-manual Report, first line = qa-guard's `QA mode: lite|full — <reason>` line, then:
automatically covered / needs manual verification / undefined edge cases.
Remind the user: next sprint `/sdlc:run <version> <sprint-slug>`; new version `/sdlc:sprint-plan <version>`.

## Context management / checkpoints

- **Phases 1-3 (analyze → design → tasks)**: you update `.sdlc/<version>/state.md` after each phase.
- **Phases 4-6 (execute → test → qa)**: the running agent owns `state.md` and updates it after each task /
  each leg (including `test_layers_done`). **Your last writes to it** are: the 4a re-check write
  (services / migration / `sprint_branch`), `required_layers` (Phase 5), `migration_done` (after the
  coordinator's `DONE`), and `services_up` / `services_up_sprint` on `NEEDS_SERVICE` while no execution
  agent is running — two writers on one file is a source of corrupted state. You also don't run the `self-review` skill for them:
  each agent has its own REQUIRED self-review section.
- What you may read throughout: `state.md`, `sprints.md`, a targeted Grep of `tasks.md` for IDs/descriptions,
  and the Human Review blocks the agents return. Never the CLAUDE.md files, `design.md`, `requirements.md`,
  the full `tasks.md`, `test-report.md`, or the config the scout reads.
- From phase 4 on you do not `git add`/`commit`/`push` (except the planning-artifacts commit in 4a, made
  before any execution agent runs), and you do not edit `design.md`/`requirements.md`/`tasks.md`. The only
  other exception: handoff (`sprints.md`, `versions.md`).
- If context is filling up: finish the current task/phase → STOP → tell the user to re-run
  `/sdlc:run <version> <sprint>`.
- Spawn a subagent for every phase to isolate context — including the ones that seem lightweight.

## Multi-sprint invocation (`sprint-22,sprint-23,sprint-24`)

A plain list of sprints is **strictly sequential**: run sprint 1 through handoff, then the next. Before
EACH sprint do the STEP 0 dependency check (a sprint depending on an unfinished one → warn/stop). Reuse
`codex_enabled` from the first question; services are re-checked per sprint (see `services_up_sprint`);
reset `services_up`, `test_layers_done`, `required_layers` when a new sprint starts. A plain list is NOT a
pipeline.

## Optional: pipelining across sprints (opt-in, default OFF)

OFF unless the user **explicitly says "pipeline" or "song song"**. Even then, only if `sprints.md` shows the
later sprint depends on nothing unfinished (no dependency on sprint N, direct or transitive) may you overlap:
sprint N+1's phases 1-3 (analyze / design / tasks) MAY run in the background (subagents) while sprint N is in
Execute/Test/QA. Rules:
- **Never run two sprints' Execute concurrently** (nor Test/QA of two sprints at once) — shared git index,
  state, services.
- If N+1 depends on N in any way → run strictly sequentially.
- **Isolation**: N+1's planning writes ONLY under `.sdlc/<version>/<N+1>/`, including its own
  `.sdlc/<version>/<N+1>/plan-state.md` (the planning pointer; never write `state.md` while N's coordinator is the sole writer). Changes it
  wants in `.sdlc/architecture.md` / `.sdlc/design-system.md` go to
  `.sdlc/<version>/<N+1>/architecture.proposal.md` / `design-system.proposal.md`. Merge `plan-state.md` into
  `state.md` and the proposals into the shared files at N's handoff (same point). N+1's artifacts are committed by N+1's own execution
  start, never concurrently with N's coordinator.
- Overlap only if N+1's File Change Plan does not overlap N's. If background subagents are unavailable, or
  anything is ambiguous → run sequentially.
- Approval gates still apply to N+1's analyze/design/tasks unless the user said "no human gate" (defined in
  STEP 0); present them at a natural pause, not by interrupting sprint N's agents.
