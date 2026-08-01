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

Spawn subagent `test-strategist` with skill `test-strategy`. It auto-detects the stack & tooling and
picks the testing approach per feature type (unit / API / Playwright UI / 3rd party sandbox / mock
webhook). If a UI design exists → add visual verification (skill `design-fidelity`): screenshots compared
against Design AC + the baseline in `.sdlc/<version>/<sprint>/visual-baseline/`. It writes tests and
ACTUALLY RUNS them until green.
Every AC/EC/NFR/DAC must have a test or be listed as manual-verify.
Writes `.sdlc/<version>/<sprint>/test-report.md`.

**It closes its own fix loop (max 5 Sonnet rounds + 1 Opus escalation round) and commits its own test
files + fixes.** You do NOT orchestrate the fix loop and do NOT touch the git index while it runs.
It returns a status on the first line: `DONE` → proceed to the QA gate; `BLOCKED` → stop, report to the
user; `DESIGN_GAP` → patch the design if small and clear, otherwise suggest `/sdlc:replan`, then respawn;
`NEEDS_SERVICE` → ask the user to start the service with the suggested command, wait for "ok", respawn;
`CONTEXT_LIMIT` → spawn a new agent to continue. Relay a short summary to the user.

## QA Gate

Spawn subagent `qa-guard`: full test run + happy path per story + regression happy path for related
existing features + NFR check + design fidelity check (if UI) + scan for hardcoded values/TODOs/unhandled
errors.
**It also closes its own fix loop (max 5 Sonnet rounds + 1 Opus escalation round, re-running the full
checklist each round) and commits itself** — you only receive the status, you do not fix anything and do
not touch git. Only on status `DONE` do you present the Pre-manual Report:
- Automatically covered (no user check needed)
- Needs manual verification (business behavior only)
- Undefined edge cases (if any)

Finish: run skill `self-review`. Update `.sdlc/<version>/state.md`.
