---
description: Run the task breakdown phase alone for one sprint — turn the design into an executable task list with dependencies, checkpoints, and full AC/EC coverage. Documentation only, no execution.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:tasks

Run the task breakdown phase alone for sprint `$2` in version `$1`
(if empty, read from `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

Requires `.sdlc/<version>/<sprint>/design.md` to exist (run `/sdlc:design` first if not).

**Do NOT Glob CLAUDE.md / Read design.md / architecture.md yourself.** Spawn a subagent (with skill
`task-breakdown`) — it loads the relevant CLAUDE.md files per the File Change Plan in `design.md`, reads
`architecture.md`, and runs `self-review` itself before returning the file.

## Documentation only — NO execution

This phase **only breaks down tasks and writes documentation**. No code implementation, no service
pre-flight. Execution starts with `/sdlc:task` (one task at a time, manually) or `/sdlc:execute`
(the whole sprint, sequentially).

## Process

The subagent writes `.sdlc/<version>/<sprint>/tasks.md` with the tasks (status `todo`), dependencies,
markers for tasks that can run in parallel, and an AC/EC → task table. It returns a Human Review block
to relay + a short list of IDs/descriptions for the main conversation to sync into TodoWrite (do not
Read all of `tasks.md`).

Update `.sdlc/<version>/state.md`.

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
