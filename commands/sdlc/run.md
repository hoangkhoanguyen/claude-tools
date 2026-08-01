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
| `product-analyst`, `architect`, `ui-designer`, `reviewer` | `inherit` | Phases 1-3 are where one mistake cascades into every later phase → run the model the user chose |
| `preflight-scout`, `implement-coordinator`, `feature-builder`, `test-strategist`, `qa-guard` | sonnet | Phases 4-6 are repetitive work with a clear spec in hand — hard-pinned to lower the model regardless of the main session |

**Escalating to Opus is the execution agent's job, not yours.** `implement-coordinator`,
`test-strategist`, and `qa-guard` promote `feature-builder` to Opus once Sonnet has failed 5 rounds at
the same spot (details in each agent file). You only receive the status on the report's first line. Don't
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

### Phase 2 — Design (2 parallel, INDEPENDENT branches)
Both agents load CLAUDE.md/architecture.md/requirements.md cold — you do NOT read for them.
- **System**: spawn `architect` (skill `system-design`) → writes `.sdlc/<version>/<sprint>/design.md`;
  updates `.sdlc/architecture.md` if foundational components are added/changed. This branch only needs
  `requirements.md` — it does **NOT wait for the UI design**, it runs straight through to `done`.
- **UI**: spawn `ui-designer` (skill `design-fidelity` + `artifact-design`). It examines the UI scope in
  `requirements.md`, picking a design source per screen:
  - Requirements have **no screens** → `design_ui: n/a`, skip the branch.
  - Requirements **have screens** → `ui-design.md` must cover every screen/state:
    - Screen present in the external design `.sdlc/<version>/<sprint>/ui-design.input.md` → ingest +
      normalize as `[external]`.
    - Screen not provided → generate as `[generated]`, source priority: external tokens →
      `.sdlc/design-system.md` → DESIGN.md → existing project: the current app's style → new project with
      no source: ask the user once.
  Writes `.sdlc/<version>/<sprint>/ui-design.md`; updates `.sdlc/design-system.md`.

**Sync before Tasks**: only move to phase 3 once the UI branch has a complete `ui-design.md`.

Self-review: each agent runs it before returning the file (you don't run it for them).
**→ Reviewer gate**: spawn `reviewer` to check `design.md` (+ `ui-design.md`) against `requirements.md` —
it reads them itself. Only `PASS` moves on.

**→ Human approval gate (REQUIRED)**: Present a summary of the "Human Review" section of `design.md` (and
`ui-design.md` if present), then **STOP and ask whether they approve** before running Tasks. Example:

> ✅ Design complete. Summary:
> - [architecture, main data model, notable API contracts]
> - [UI screens / design tokens if any]
> - [Regression-safe plan / breaking changes if any]
>
> Reply **"ok"** or **"approve"** to continue to Tasks & Execute, or give feedback to adjust the design first.

Only continue to phase 3 once the user confirms. Write `design_approved: true` into
`.sdlc/<version>/state.md`.

### Phase 3 — Tasks
Spawn a subagent (skill `task-breakdown`). It loads the relevant CLAUDE.md itself (per the File Change
Plan in `design.md`) + architecture.md, runs self-review itself, writes
`.sdlc/<version>/<sprint>/tasks.md` (status todo), and returns a list of IDs + short descriptions for you
to sync into TodoWrite (do NOT Read all of `tasks.md`).
Generate `.sdlc/<version>/<sprint>/commands.md` (same as `/sdlc:tasks`): listing the per-task command
`/sdlc:task <version> <sprint> <task-id>` and the run-to-completion command
`/sdlc:execute <version> <sprint>` (implement + test + qa) — so the user can run or redo them manually later.

**→ Human approval gate (REQUIRED)**: Present a summary of `tasks.md`, then **STOP and ask whether they
approve** before running Execute. Example:

> ✅ Tasks complete. Summary:
> - [task count, short list of each task with the AC it serves]
> - [which tasks run in parallel, notable dependency ordering]
>
> Reply **"ok"** to let `/sdlc:run` continue to completion (implement + test + qa). Or stop here and run
> it yourself: `/sdlc:execute` (run to completion) / `/sdlc:task` (one task at a time, manually).

Only continue to phase 4 once the user confirms. Write `tasks_approved: true` into
`.sdlc/<version>/state.md`.

### Phase 4 — Execute (the most important one)

**4a. Pre-flight (REQUIRED before writing code):**
From here to the end of phase 6, your context must be as lean as possible — it already carries analyze +
design + tasks. Every execution agent loads `CLAUDE.md`/`design.md`/the repo's skills itself at startup,
so **don't read them on their behalf**.

- **Spawn `preflight-scout`** (read-only): it reads `docker-compose.yml`, `.env.example`, `package.json`
  scripts, `Procfile`, `Makefile`, and the README for you, pings ports itself, and returns a table of
  service + port + status + start command + migrate command. You do not read that pile of config.
- **Confirm services for phases 4-5-6 in one pass** — the scout's table already includes the dev
  server/sandbox that Test and QA need. Asking incompletely here means phases 5/6 return `NEEDS_SERVICE`,
  and every respawn is another cold start.
- ONLY ask the user to start what the scout reports as "not running", with the command it provided. WAIT
  for the user to confirm before continuing. Write `services_up` into `.sdlc/<version>/state.md` — this is
  the **last time** you write this file in the sprint.
- **Migration/seed**: if the scout reports the sprint changes the schema → run the migrate command it
  provided (after the DB is up). Record it in state.

**4b. Implement — hand off entirely to `implement-coordinator`:**
Do NOT orchestrate individual tasks in this conversation (context must still cover phases 5 + 6).
Sync TodoWrite once (get IDs + descriptions with a targeted Grep into `tasks.md`, don't Read the whole
file — each task has 7 fields and you need 2), then spawn subagent `implement-coordinator`, passing
`version`, `sprint`, the sprint branch name, and the confirmed `services_up`. It splits into waves by
dependency → assigns each task to `feature-builder` (independent tasks in parallel) → commits each task →
writes `tasks.md` + `state.md`.

**While it runs, do NOT touch `tasks.md` / `state.md` / the git index** — it is the sole writer.

Handle the status it returns: `DONE` → phase 5. `BLOCKED` → stop, report to the user. `DESIGN_GAP` →
**you decide, `architect` writes**: for a small, clear gap spawn `architect` with the gap description to
patch `design.md` (don't read `design.md` yourself to edit it); for a large gap suggest `/sdlc:replan`;
then spawn a fresh coordinator. `NEEDS_SERVICE` → ask the user to start it, wait for "ok", respawn.
`CONTEXT_LIMIT` → spawn a fresh coordinator to continue (progress is already on disk).
Relay the report to the user as a short summary.

### Phase 5 — Test
Spawn `test-strategist` (skill `test-strategy`) → write + run tests. If a UI design exists: visual
verification (skill `design-fidelity`) — screenshots of each screen/state + dark/light, baseline in
`.sdlc/<version>/<sprint>/visual-baseline/`. Writes `.sdlc/<version>/<sprint>/test-report.md`.
**It closes its own fix loop (max 5 Sonnet rounds + 1 Opus escalation round) and commits its own test
files + fixes** — you do NOT orchestrate the fix loop and do NOT touch the git index while it runs.
Handle the status as in phase 4b.

### Phase 6 — QA Gate
Spawn `qa-guard`: full test run + happy path + regression + NFR + design fidelity + scan for hardcoded
values/TODOs.
**It also closes its own fix loop (max 5 Sonnet rounds + 1 Opus escalation round, re-running the checklist
from the top each round) and commits itself.**
You only receive the status; only `DONE` moves to handoff.

## Handoff

Set the sprint status to `done` in `.sdlc/<version>/sprints.md`.
If every sprint in the version is `done`, update `.sdlc/versions.md`: this version = `done`.

Present the Pre-manual Report: automatically covered / needs manual verification / undefined edge cases.
Remind the user: next sprint `/sdlc:run <version> <sprint-slug>`; new version `/sdlc:sprint-plan <version>`.

## Context management / checkpoints

- **Phases 1-3 (analyze → design → tasks)**: you update `.sdlc/<version>/state.md` after each phase.
- **Phases 4-6 (execute → test → qa)**: the running agent owns `state.md` and updates it after each task /
  each leg. **You do NOT write to it anymore** once you've written `services_up` at pre-flight — two
  writers on one file is a source of corrupted state. You also don't run the `self-review` skill for them:
  each agent has its own REQUIRED self-review section.
- From phase 4 on you do not `git add`/`commit`/`push`, and you do not edit
  `design.md`/`requirements.md`/`tasks.md`. The only exception: handoff (`sprints.md`, `versions.md`).
- If context is filling up: finish the current task/phase → STOP → tell the user to re-run
  `/sdlc:run <version> <sprint>`.
- Spawn a subagent for every phase to isolate context — including the ones that seem lightweight.
