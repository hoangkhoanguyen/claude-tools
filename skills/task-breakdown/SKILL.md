---
name: task-breakdown
description: How to split a sprint's design into an executable task list with dependency ordering, checkpointable and resumable, missing no AC. Use in the SDLC tasks phase before execute.
---

# Task Breakdown

The skill of turning `design.md` into a task list for feature-builder to execute in order, each task being
a complete, checkpointable unit (so work can resume after an interruption).

## Task-splitting principles

- **Each task small enough to complete + test in one go**, but large enough to be a meaningful unit
  (e.g. "create the POST /orders endpoint + validation", not "write one if statement").
- **Independent tasks that can run in parallel** are marked so execute can use parallel subagents.
- **Tasks with dependencies** state the order explicitly (task B needs task A finished first).
- **Each task points back to**: the story/AC it serves, the relevant design section, the files it's expected
  to touch, and the ECs it must handle.

## Miss no AC

Every `AC-xx`, `EC-xx`, and `NFR-xx` in the requirements — and every `DAC-xx` in the ui-design (if there's
UI) — must be owned by at least one task. Include an **AC/EC/NFR/DAC → task** table as proof of coverage.
This is the checkpoint: a missing mapping means a feature/design element won't get built. Consider
splitting UI tasks and system tasks so they can run in parallel.

## Task status (for resuming)

Each task has a status: `todo` / `doing` / `done` (+ `blocked` with a reason if applicable). Written to
`.sdlc/<version>/<sprint>/tasks.md`. During execute, sync with TodoWrite in the session; update the file
after each task so the next run knows where to continue.

## Task template

```
- [ ] TASK-03  (todo)
  Description: Create the POST /orders endpoint with stock validation
  Serves: Story-02 (AC-02.1, AC-02.2), EC-01, EC-04
  Design ref: API Contracts §POST /orders, Data Model §Order
  Expected files: src/routes/orders.ts, src/services/order.ts
  Dependencies: TASK-01 (Order schema)
  Suggested skill: <skill name if any — e.g. migration, component-gen, e2e-test; leave empty if none>
  Difficulty: normal | high
  Test: unit tests for the service + smoke test the POST endpoint
```

The `Suggested skill` field: fill in the name of a project skill (in `.claude/skills/`, a plugin, or
built-in) that this task should use. Base it on the kind of work (DB migration → migration skill;
generating components → component-gen skill; E2E testing → e2e skill; …). Leave it empty if no skill beats
the default approach. This is a hint for feature-builder — not mandatory if the skill doesn't match reality.

The `Difficulty` field: defaults to `normal`. The implement leg runs on Sonnet, and `high` is the signal for
`implement-coordinator` to assign that task to Opus from the very first attempt instead of waiting for
Sonnet to fail 5 times. So marking `high` must be **justified, not a gut feeling** — only use it when the
task falls into one of these:

- Non-trivial algorithms (optimization, graphs, scheduling, financial calculations).
- Concurrency / race conditions / locking / idempotency.
- Multi-step transactions requiring consistency (distributed, rollback, saga).
- Cryptography, authentication, or authorization at the design level (not just calling an existing library).
- Refactors touching many working modules, with wide regression risk.

A long task or one spanning many files is **not** the same as `high` — that's a task that should be split.
Marking `high` liberally destroys the entire speed/cost benefit of the execution leg; save it for the kind
of work where mistakes don't surface through tests.

## Self-review checklist before finalizing

- [ ] Does every AC-xx / EC-xx have at least one owning task (with a mapping table)?
- [ ] Are the parallelizable tasks marked?
- [ ] Are the dependencies between tasks in the right order?
- [ ] Does each task have clear test criteria for marking it done?
- [ ] Is every task marked `Difficulty: high` genuinely justified by the list above, not just long?
