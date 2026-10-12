---
name: failure-ladder
description: The shared retry and escalation ladder for every fix loop in a sprint (implement batches, test fixes, QA fixes) — 5 Sonnet rounds, then 1 Opus round with the full history, early escalation, what does not count, and the history format. Load it on the FIRST failure you need to retry.
---

# Failure ladder

One definition of how a failing batch / red test / unmet QA item is retried. Callers keep a two-line summary with
the numbers; this skill holds the details so they cannot drift apart.

## The ladder (counted per batch for implement, per failure point for test/QA fixes)

| Round | Who fixes | Model |
|---|---|---|
| 1 → 5 | A small fix (1-2 lines, clear cause, single file): `Edit` it yourself. Anything bigger: spawn `feature-builder` scoped to exactly the failure | `sonnet` |
| 6 | `feature-builder`, told this is the final escalation, with the full history of rounds 1-5 | `opus` (pass `model: "opus"` on the Agent call) |
| still failing after round 6 | stop with status `BLOCKED` | — |

- **Early escalation:** three consecutive rounds with the same cause (same red test, same error, same file) →
  go straight to the Opus round. Repeating a wrong direction produces no new information.
- **Opus from the first attempt** only for tasks marked `Difficulty: high` in `tasks.md` (implement leg only).
- **Do not count** `DESIGN_GAP` (the design is missing/contradictory — a bigger model cannot guess intent; stop,
  the caller has `architect` patch it) or `NEEDS_SERVICE` (switching models does not start a service).
- A failed Codex attempt counts as round 1 (the implement coordinator then gives `feature-builder` rounds 2-5).
- No `Agent` tool available: you cannot escalate. After 5 rounds stop with `BLOCKED` and put `needs Opus
  escalation` in the reason.

## History you MUST pass on every retry

The next attempt cold-starts and repeats your mistake unless you tell it what was tried. Include, per previous
round: the approach, what changed (files), which check was red and the real error text, and your suspicion of the
cause. A builder that returns `blocked` must supply a "What was tried" section in this shape; copy it verbatim into
the retry prompt. On the final Opus round say so explicitly and list all five tried approaches.

## When the budget is spent

Stop with `BLOCKED`. State which checks are red, what each round tried, and where you suspect the cause. Do not
thrash, do not mark anything done, and do not respawn with Opus yourself afterwards — `BLOCKED` means a human
decision is needed.
