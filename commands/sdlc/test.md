---
description: Run the test phase alone for one sprint — auto-detect the testing approach for the stack (unit, API, Playwright UI, 3rd party sandbox), write + run tests, then the QA gate for a clean handoff.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:test

Run the test phase + QA gate alone for sprint `$2` in version `$1`
(if empty, read from `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

**Load context first (principle 0):** Glob the whole repo to list every `CLAUDE.md`; read the root file
+ the relevant ones. Read `.sdlc/architecture.md`. Learn the project's test commands and conventions.

## Model policy

`test-strategist` and `qa-guard` declare `model: sonnet` in their frontmatter — **do not pass a `model`
parameter when spawning them**. Both escalate `feature-builder` to Opus on the final fix round once
Sonnet has failed 5 rounds. On `BLOCKED`, do not respawn with Opus: the escalation budget is already
spent, and `BLOCKED` means a human decision is needed.

## Test

Spawn subagent `test-strategist` with skill `test-strategy`, **passing the `layer` input**:
- the sprint has UI (ui-design.md exists) AND more than 5 tasks → spawn it twice, sequentially:
  `layer: integration` first, then (once it returns `DONE`) `layer: ui`, each with fresh context;
- otherwise (no UI, or ≤ 5 tasks) → one spawn with `layer: all`.

It consumes the **Test Plan** at the top of `tasks.md`: unit/api tests are owned by the tasks (builders
already wrote and ran them) so it verifies them and fills gaps only; it owns integration / e2e / visual /
manual items. It auto-detects the stack & tooling and picks the testing approach per feature type (API /
Playwright UI / 3rd party sandbox / mock webhook). If a UI design exists → visual verification (skill
`design-fidelity`): screenshots compared against Design AC + the baseline in
`.sdlc/<version>/<sprint>/visual-baseline/`. It writes tests and ACTUALLY RUNS them until green.
Every AC/EC/NFR/DAC must have a test or be listed as manual-verify.
Writes its layer's section of `.sdlc/<version>/<sprint>/test-report.md` (plus the HEAD sha of the green full
run) and records `test_layers_done` in state; `test: done` is set only when every required layer is done.

**It closes its own fix loop (max 5 Sonnet rounds + 1 Opus escalation round) and commits its own test
files + fixes.** You do NOT orchestrate the fix loop and do NOT touch the git index while it runs.
It returns a status on the first line: `DONE` → proceed to the QA gate; `BLOCKED` → stop, report to the
user; `DESIGN_GAP` → patch the design if small and clear, otherwise suggest `/sdlc:replan`, then respawn;
`NEEDS_SERVICE` → ask the user to start the service with the suggested command, wait for "ok", respawn;
`CONTEXT_LIMIT` → spawn a new agent to continue. Relay a short summary to the user.

## QA Gate

Spawn subagent `qa-guard` (it picks its own mode and states it in the report): **lite by default** — clean-code
scan on the sprint diff + regression happy path for related existing features + Definition-of-Done check +
verification that `test-report.md` covers every AC/EC/NFR/DAC (with spot-checks), skipping the full-suite
re-run when test-report records a green full run at the current HEAD. **Full mode** (full suite + happy path
per story + NFR + design fidelity + security review) when the sprint touches auth/permissions/payments/PII,
the Test leg made source fix commits, there is no green full run at HEAD, or the user asked for full QA.
**It also closes its own fix loop (max 5 Sonnet rounds + 1 Opus escalation round; re-running affected items +
the full suite in lite mode, the whole checklist in full mode) and commits itself** — you only receive the status, you do not fix anything and do
not touch git. Only on status `DONE` do you present the Pre-manual Report:
- Automatically covered (no user check needed)
- Needs manual verification (business behavior only)
- Undefined edge cases (if any)

Finish: run skill `self-review`. Update `.sdlc/<version>/state.md`.
