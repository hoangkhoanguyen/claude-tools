---
description: Execute ONE specific task in a sprint — pre-flight, implement, local tests, update status. Use it to run tasks manually one at a time instead of the whole sprint.
argument-hint: [version-slug] [sprint-slug] [task-id]
---

# /sdlc:task

Manually execute ONE task in a sprint. (To run the whole sprint to completion — implement + test + qa —
→ use `/sdlc:execute`.)

## Identifying the task to run

- **All arguments given** (`$1 $2 $3`): run task `$3` in sprint `$2` of version `$1`.
- **Missing version/sprint**: take them from `.sdlc/versions.md` (active version) +
  `.sdlc/<version>/state.md` (in-progress sprint).
- **Missing task-id (`$3` empty)**: read `.sdlc/<version>/<sprint>/tasks.md`, print the list of
  **unfinished** tasks (with ID + short description + dependency status) and let the user choose —
  prefer `AskUserQuestion` to render clickable chips; otherwise number them for the user to pick. Only
  list tasks still to do, don't show completed ones.

Requires `.sdlc/<version>/<sprint>/tasks.md` to exist (run `/sdlc:tasks` first if not).
The chosen task must have status `todo` or `doing`. If already `done` → tell the user, don't redo it.

## Dependency check

Read the "Dependencies" section of the chosen task in `tasks.md`. If it depends on a task that is NOT
`done` → STOP, warn the user and suggest running the dependency first (unless the user asks to proceed).

## Pre-flight

Read `.sdlc/<version>/state.md` and check whether `services_up` already lists the services this task needs
**and `services_up_sprint` equals this sprint** (a `services_up` from another sprint is stale → treat as not
sufficient).

**Not sufficient**: infer the required external services from the project config (docker-compose,
.env.example, package.json scripts, Makefile, Procfile). Bash ping/check each port. Ask the user to start
what's missing with a suggested command, wait for an "ok" confirmation. Write the confirmed services into
`services_up` in state. Run migrations if the sprint changes the schema.

**Sufficient**: skip, don't ask again.

## Implement

Load context: read the relevant `CLAUDE.md` files (principle 0) + `.sdlc/architecture.md` + the sprint's
design. Read the chosen task's details from `tasks.md` (description, AC/EC served, design refs, expected
files, `Done when:` — or the legacy `Test:` field —, `Batch`, `Tests:`).

Before coding: set the chosen task to `doing` in `tasks.md`; in state set
`current_phase: execute`, `current_task: <task-id>`, `execute: doing`.

Spawn `feature-builder` (it declares `model: sonnet` in its frontmatter — **do not pass a `model`
parameter** on the first attempt). A single task is treated as a **batch of 1** (same contract as the
batch dispatch in `/sdlc:execute`, report per task):
- Implement exactly the task's scope — don't do other tasks.
- Write the unit/api tests listed in the task's `Tests:` field (from the Test Plan in `tasks.md`) together
  with the code, and run them (scoped) until they pass, asserting the concrete expected values the `Tests:`
  items state (a doubtful expectation → report a design gap, don't adapt the test). The task is not `done`
  without them unless `Tests:` says `none` with a reason. **Legacy task with no `Tests:` field** (old
  `tasks.md`): write the tests that satisfy its `Done when:` / `Test:` criteria — don't block.
  Integration/e2e/visual/manual items stay with the Test leg (`/sdlc:test`), not this command.
- If the task shares a `Batch` with other tasks, still run just this one (a batch of 1); don't touch the
  others.
- Include in the prompt the Code map of finished tasks touching the same module, if any (marked "verify
  before trusting").
- Self-review (skill `self-review`): all EC handled? no TODOs/hardcoded values left? tests actually green?
- Report back: files touched, tests written + run, a `Code map` (3-8 lines), suggested commit message.

**When the task doesn't finish** (in this command you are the orchestrator, so you hold the budget): 5 Sonnet
rounds, then 1 Opus round (`model: "opus"`, with the full history of what was tried), then mark the task
`blocked` in `tasks.md` with the reason and report to the user; 3 identical failures → escalate early; a
`Difficulty: high` task in `tasks.md` starts on Opus; a `design gap` report doesn't count — have `architect`
patch `design.md`, then re-run. Always respawn with the previous "What was tried" section. Load skill
`failure-ladder` on the first retry for the details.

Once you receive the report, **you (this command) write the state** — the subagent does not:
- `git commit` the task on `sprint_branch` (from state; if it is missing, the current branch) as `feat(<sprint>): <desc> [TASK-xx]` (no push / no PR unless
  the user asks).
- Set the task to `done` in `.sdlc/<version>/<sprint>/tasks.md` + TodoWrite. If it couldn't be completed
  (missing prerequisites, errors outside scope) → set `blocked` with the reason, do NOT set `done`.
- Update `.sdlc/<version>/state.md` (`current_task`, `updated_at`; if EVERY task is `done` then
  `execute: done`).

## Finishing

Report the task done. Read `tasks.md`, identify the next unfinished task (in dependency order), and suggest:

> ✅ TASK-XX done. Next task: TASK-YY — <short description>.
> Continue with: `/sdlc:task` (pick from the list) — or run everything remaining:
> `/sdlc:execute <version> <sprint>`
