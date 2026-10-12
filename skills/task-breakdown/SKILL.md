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

## Test Plan (top of the Agent Reference part of tasks.md)

Before the task list, write a **Test Plan** table: `AC / EC / NFR / DAC id → level → owner`.

- **level**: `unit | api | integration | e2e | visual | manual` — choose per the decision table in the
  `test-strategy` skill (pure logic → unit; API endpoint → api; 3rd party / webhook / async / DB side effect →
  integration; UI flow → e2e; UI with a design → visual; needs a real human → manual).
- **owner**: `unit` and `api` items are OWNED BY A TASK (the builder writes + runs them together with the
  code) → put the task id. `integration`, `e2e`, `visual`, `manual` items are owned by `test-leg`.
- Every AC/EC/NFR/DAC appears in this table (it can be merged with the AC/EC/NFR/DAC → task table).

## Batches

Group tasks into **batches** so one feature-builder implements several related tasks with one code
exploration instead of cold-starting per task. Each task gets `Batch: B<n>`.

- A batch has **at most 4 tasks**, all touching the same module / files area.
- Tasks in a batch are dependency-compatible: a later task may depend on an earlier task in the same batch,
  or on tasks that are already done / in an earlier wave. No task depends on a task in a *different* batch
  of the same wave.
- A `Difficulty: high` task is its own batch (batch of 1).
- Independent batches can run in parallel (same wave); batches with dependencies are ordered.
- Tasks keep their own ID, AC/EC mapping, status, and their own git commit — batching only changes who
  implements them, not how they are tracked.

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
  Batch: B2
  Tests: tests/services/order.test.ts (unit: stock validation — AC-02.1, EC-01); tests/routes/orders.test.ts (api: POST /orders 201/409 — AC-02.2, EC-04)
  Test: smoke test the POST endpoint (done criteria)
```

The `Suggested skill` field: fill in the name of a project skill (in `.claude/skills/`, a plugin, or
built-in) that this task should use. Base it on the kind of work (DB migration → migration skill;
generating components → component-gen skill; E2E testing → e2e skill; …). Leave it empty if no skill beats
the default approach. This is a hint for feature-builder — not mandatory if the skill doesn't match reality.

The `Difficulty` field: defaults to `normal`. The implement leg runs on Sonnet, and `high` is the signal for
`implement-coordinator` to assign that task to Opus from the very first attempt instead of waiting for
Sonnet to fail 5 times. So marking `high` must be **justified, not a gut feeling** — use it ONLY for:

- Algorithms with non-trivial correctness (pricing / allocation / scheduling math, optimization, graphs).
- Concurrency / locking / idempotency / distributed transactions (multi-step consistency, rollback, saga).
- Cryptography / token / session security **design**.
- Data migrations that rewrite existing data.

These are `normal`, NOT `high`: standard CRUD, plain service / controller / DTO / UI work, auth *wiring*
using an existing library, adding fields or endpoints, and "long or many-file" tasks (a long task should be
split, not marked high). **When unsure → `normal`**: the retry ladder already escalates to Opus on failure,
so under-rating is cheap, while over-rating destroys the speed/cost benefit of the execution leg.

## Self-review checklist before finalizing

- [ ] Does every AC-xx / EC-xx have at least one owning task (with a mapping table)?
- [ ] Are the parallelizable tasks marked?
- [ ] Are the dependencies between tasks in the right order?
- [ ] Does each task have clear test criteria for marking it done?
- [ ] Is every task marked `Difficulty: high` genuinely justified by the list above, not just long?
- [ ] Is there a Test Plan covering every AC/EC/NFR/DAC with level + owner, and does each task have `Tests:` (or `none` + reason)?
- [ ] Does every task have a `Batch` (≤ 4 tasks, same module, dependency-compatible, `high` = batch of 1)?
