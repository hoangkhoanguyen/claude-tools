---
description: Run the test phase alone for one sprint — auto-detect the testing approach for the stack (unit, API, Playwright UI, 3rd party sandbox), write + run tests, then the QA gate for a clean handoff.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:test

Run the test phase + QA gate alone for sprint `$2` in version `$1`
(if empty, read from `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

Agents load their own context (CLAUDE.md files, architecture, requirements) — do NOT read them in the main
conversation; just relay the status. Do not write `state.md`, with two exceptions while no execution agent is
running: the Test setup below (`required_layers`, `test_layers_done`, `test`), and on `NEEDS_SERVICE` ONLY
`services_up` (+ `services_up_sprint`).

## Model policy

`test-strategist` and `qa-guard` declare `model: sonnet` in their frontmatter — do NOT pass a `model` parameter
when spawning them. Each escalates its own fix rounds to Opus per skill `failure-ladder`; on `BLOCKED` do not
respawn with Opus — `BLOCKED` means a human decision is needed.

## Test

**Setup.** An explicit `/sdlc:test` means the user wants a re-test: reset `test_layers_done: []` and
`test: todo` in state. Then compute `required_layers` and write it to state. Read `has_ui` from state; only if it
is absent, fall back to: `design_ui` is not `n/a`, else `ui-design.md` exists. `has_ui: yes` → `[integration, ui]`;
`has_ui: no` → `[all]`. Legacy sprint (no Test Plan in tasks.md, or an old test-report.md without layer
sections) → `[all]`.

Spawn subagent `test-strategist` with skill `test-strategy`, **passing the `layer` input**, ONLY for layers not
already in `test_layers_done`:
- `[integration, ui]` → spawn sequentially: `layer: integration` first, then (once it returns `DONE`)
  `layer: ui`, each with fresh context — regardless of task count;
- `[all]` → one spawn with `layer: all`.

The agent defines its own work (Test Plan ownership, stack detection, visual verification against the
baseline in `.sdlc/<version>/<sprint>/visual-baseline/`, `test-report.md`, `test_layers_done`; `test: done` is
set by the last required layer). It closes its own fix loop and commits its own tests, fixes and `.sdlc/`
files — do NOT orchestrate a fix loop or touch the git index while it runs.

Act on the first-line status: `DONE` → proceed to the QA gate; `BLOCKED` → stop, report to the user;
`DESIGN_GAP` → patch the design if small and clear, otherwise suggest `/sdlc:replan`, then respawn;
`NEEDS_SERVICE` → ask the user to start the service with the suggested command, wait for "ok", respawn;
`CONTEXT_LIMIT` → spawn a new agent to continue. Relay a short summary to the user.

## QA Gate

Spawn subagent `qa-guard`. It picks its own mode (lite or full) from the test-report and the git history, closes
its own fix loop, and commits itself — you only receive the status. Act on the first-line status as above; only
on `DONE` present its Pre-manual Report to the user verbatim (its first line is
`QA mode: lite|full — <reason>`).
