---
description: Run the task breakdown phase alone for one sprint — turn the design into an executable task list with dependencies, checkpoints, and full AC/EC coverage. Documentation only, no execution.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:tasks

Run the task breakdown phase alone for sprint `$2` in version `$1`
(if empty, read from `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

Requires `.sdlc/<version>/<sprint>/design.md` to exist (run `/sdlc:design` first if not).

**Do NOT Glob CLAUDE.md / Read design.md / architecture.md yourself.** Spawn the subagent
`task-breakdown` (it uses the skill of the same name) — it loads the relevant CLAUDE.md files per the File
Change Plan in `design.md`, reads `architecture.md`, `ui-design.md` (if present) and `requirements.md`, and runs
its self-review itself before returning the file.

## Documentation only — NO execution

This phase **only breaks down tasks and writes documentation**. No code implementation, no service
pre-flight. Execution starts with `/sdlc:task` (one task at a time, manually) or `/sdlc:execute`
(the whole sprint to completion).

## Process

The `task-breakdown` subagent writes `.sdlc/<version>/<sprint>/tasks.md` with a Test Plan (AC/EC/NFR/DAC → level → owner, where DAC = Design Acceptance Criteria from `ui-design.md`),
the tasks (status `todo`, each with `Batch`, `Tests:` carrying concrete expected values, and `Done when:`), dependencies, markers for tasks that can run in
parallel, and an AC/EC → task table. (Within `/sdlc:run`, `architect` writes tasks.md together with
design.md in one pass on no-UI sprints, and the `task-breakdown` agent writes it on UI sprints; this command is
for regeneration / replan or standalone use. If it runs on a sprint whose gates were already approved, tasks.md
changed, so remove `tasks` from `reviewer_passed` in state.md.) **Regeneration when done tasks exist:** keep each done task's
ID, `Batch`, and `Tests:` untouched; amend only the unfinished tasks. It returns a status line (`DONE` / `DESIGN_GAP`), a
Human Review block to relay, and a short list of IDs/descriptions for the main conversation to sync into
TodoWrite (do not Read all of `tasks.md`). On `DESIGN_GAP`, have `architect` patch `design.md`, then re-run.

Update `.sdlc/<version>/state.md` (`tasks: done`, `current_phase`).

## Generating command shortcuts

Once `tasks.md` is complete and self-review passes, write `.sdlc/<version>/<sprint>/commands.md`
using this template (fill in the real version, sprint, task IDs and short descriptions from tasks.md):

```
# Sprint Commands — <sprint-slug>

## Run tasks one at a time (manual)
# Type /sdlc:task (no args) to pick a task from the list; or target one directly:
/sdlc:task <version> <sprint> TASK-01   # <short description of task 01>
/sdlc:task <version> <sprint> TASK-02   # <short description of task 02>
...

## Run execution to completion (implement + test + qa + handoff)
/sdlc:execute <version> <sprint>
```

After writing `commands.md`, print its contents so the user sees it immediately.

This is a sub-phase of `/sdlc:run`; use it when you want to run or redo the task breakdown phase alone.
