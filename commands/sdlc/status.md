---
description: View overall SDLC progress — which version is active, which sprints are done/in progress/pending, and the current phase and task. Reads from .sdlc/.
---

# /sdlc:status

Show the project's current progress. Changes nothing, read-only.

## Steps

1. Read `.sdlc/versions.md` → list of versions and each version's status.
2. For each version, read `.sdlc/<version>/sprints.md` → status of each sprint.
3. Read `.sdlc/<version>/state.md` for the active version → current sprint, current phase, in-progress task.
   Check the approval gates: a phase marked `done` with `*_approved: pending` → waiting on user approval
   (surface this clearly in the Resume section).
4. For the in-progress sprint, read `.sdlc/<version>/<sprint>/tasks.md` → count todo/doing/done tasks.

## Presenting

```
📊 SDLC Status

Versions:
  ✅ v1   done        (sprint-1-auth, sprint-2-orders, sprint-3-reports)
  🔄 v2   in-progress → sprint-1-upgrade › phase: execute (task 3/5)
  ⬜ v3   planned

Active version: v2
  Sprint:  sprint-1-upgrade
  Phase:   execute
  Tasks:   3 done, 1 doing, 1 todo
  Current: TASK-03 (create POST /upgrade endpoint)

▶ Resume:
  /sdlc:run v2 sprint-1-upgrade
  └─ Will continue from: execute › TASK-03
```

If waiting at an approval gate (e.g. tasks done but `tasks_approved: pending`), surface it clearly:

```
▶ Resume:
  /sdlc:run v2 sprint-1-upgrade
  └─ ⏸ Waiting for you to approve the task list before Execute (reply "ok" when running /sdlc:run)
```

If the active version has finished all its sprints, suggest:

```
▶ Start the next sprint in v2:
  /sdlc:run v2 sprint-2-...

▶ Or start a new version:
  /sdlc:sprint-plan v3 <docs>
```

If `.sdlc/` doesn't exist yet, suggest running `/sdlc:sprint-plan v1 <docs>` first.
