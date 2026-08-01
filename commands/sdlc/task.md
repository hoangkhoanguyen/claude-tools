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

Read `.sdlc/<version>/state.md` and check whether `services_up` already lists the services this task needs.

**Not sufficient**: infer the required external services from the project config (docker-compose,
.env.example, package.json scripts, Makefile, Procfile). Bash ping/check each port. Ask the user to start
what's missing with a suggested command, wait for an "ok" confirmation. Write the confirmed services into
`services_up` in state. Run migrations if the sprint changes the schema.

**Sufficient**: skip, don't ask again.

## Implement

Load context: read the relevant `CLAUDE.md` files (principle 0) + `.sdlc/architecture.md` + the sprint's
design. Read the chosen task's details from `tasks.md` (description, AC/EC served, design refs, expected
files, test criteria).

Before coding: set the chosen task to `doing` in `tasks.md`; in state set
`current_phase: execute`, `current_task: <task-id>`, `execute: doing`.

Spawn `feature-builder` (it declares `model: sonnet` in its frontmatter — **do not pass a `model`
parameter** on the first attempt):
- Implement exactly the task's scope — don't do other tasks.
- Run local tests until they pass.
- Self-review (skill `self-review`): all EC handled? no TODOs/hardcoded values left? tests actually green?
- Report back: files touched, tests run, suggested commit message.

**Escalating when the task doesn't finish** (in this command you are the orchestrator, so you hold the budget):

- Returns `blocked` → respawn `feature-builder`, **including the full "What was tried" section from the
  previous attempt**. It cold-starts each time; without the history it repeats the same mistakes.
- Max **5 Sonnet attempts**. Attempt **6** spawns with `model: "opus"`, stating clearly this is the final
  escalation attempt and listing all 5 approaches already tried. Still not done → mark the task `blocked`
  in `tasks.md` with the reason, and report to the user.
- **Escalate early** if three consecutive attempts fail identically (same red test, same error) — don't
  wait for all 5.
- If `tasks.md` marks the task `Difficulty: high`, or it touches algorithms / concurrency / transactions /
  cryptography → spawn with `model: "opus"` directly on the first attempt.
- Reports a `design gap` → **does not count against the budget**, and changing models won't help: stop,
  have `architect` patch `design.md` (it runs on Opus), then re-run the task.

Once you receive the report, **you (this command) write the state** — the subagent does not:
- `git commit` the task on the sprint branch (no push / no PR unless the user asks).
- Set the task to `done` in `.sdlc/<version>/<sprint>/tasks.md` + TodoWrite. If it couldn't be completed
  (missing prerequisites, errors outside scope) → set `blocked` with the reason, do NOT set `done`.
- Update `.sdlc/<version>/state.md` (`current_task`, `updated_at`; if EVERY task is `done` then
  `execute: done`).

## Finishing

Report the task done. Read `tasks.md`, identify the next unfinished task (in dependency order), and suggest:

> ✅ TASK-XX done. Next task: TASK-YY — <short description>.
> Continue with: `/sdlc:task` (pick from the list) — or run everything remaining:
> `/sdlc:execute <version> <sprint>`
