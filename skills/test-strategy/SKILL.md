---
name: test-strategy
description: A decision table for choosing the testing approach by tech stack and feature type — unit tests, API tests, Playwright UI automation, 3rd party sandboxes, mock webhooks. Use in the SDLC test phase to automate as much as possible and leave only what genuinely needs manual verification.
---

# Test Strategy

The skill of detecting the right testing approach and executing it, so that when the user manual tests they
ONLY verify business behavior and hit NO minor bugs.

## The overriding principle: automate as much as possible

Only push something to "needs manual verification" when it TRULY can't be automated (real SMS OTP, Face ID,
real money, subjective UX judgment). Everything else must be tested automatically.

## Who owns which test

The planning phase writes a **Test Plan** at the top of the Agent-Reference part of `tasks.md`:
`AC/EC/NFR/DAC id → level (unit | api | integration | e2e | visual | manual) → owner`, following the table below
(DAC-xx = Design Acceptance Criteria in `ui-design.md`; owner = `task:<TASK-id>` or `test-strategist`).

- **unit and api tests are owned by the TASK** — the builder writes and runs them together with the code
  (each task's `Tests:` field). The `test-strategist` agent verifies them and fills only genuine gaps.
- **integration / e2e / visual / manual are owned by `test-strategist`**, which runs by layer (`integration`,
  `ui`, `all`) as defined in `agents/test-strategist.md` — that file also holds the ownership reconciliation,
  commit, green-run-sha and mutation-check rules.

## Decision table by feature type

| Feature type | How to test | Tooling |
|---|---|---|
| Pure logic (utils, calculations, validation) | Unit tests | the stack's test runner (jest/vitest/pytest/go test…) |
| API endpoint | Real HTTP calls, assert status + shape + business rules | curl / supertest / requests |
| UI flow (no 3rd party) | Drive the browser: navigate/fill/click/assert | Playwright (pre-installed) |
| Flow with a 3rd party (OAuth, payment) | Browser + sandbox/test mode | Playwright + Stripe test keys / OAuth sandbox |
| Webhook / async | Trigger + mock callback + verify the side effect | test runner + DB/state checks |
| UI with a design (DESIGN.md/ui-design.md) | Visual verification: Playwright screenshots per DAC-xx (tokens, contrast, responsive, dark/light) checked against the baseline | Playwright + skill `design-fidelity` |
| Requires a real human (SMS OTP, Face ID, real money) | Can't be automated → list for manual verification | — |

## Playwright UI tests: write specs, don't drive the browser step by step

Every interactive browser command is a turn whose result is re-read on all later turns. So the UI layer is
**spec files run by the runner**, not a hand-driven session; open a browser by hand only to debug one red test.

- **One spec per `FLOW-xx`** (including its error/cancel branches), run by file, results read from the runner
  output. Reuse the project's existing Playwright config, fixtures and helpers before creating new ones.
- **Log in once.** A global setup saves `storageState` per role; specs reuse it. Seed data through the API/DB,
  never through the UI.
- **Server via config.** Declare `webServer` in the Playwright config (command, url, `reuseExistingServer`) so the
  runner starts and waits for the dev server; don't curl-poll it from the agent. Run headless.
- **Stable by construction.** Locate by role / label / test-id; rely on auto-waiting and web-first assertions
  (`expect(locator)...`); never `waitForTimeout`. Allow `retries: 1` at most, and report any test that only
  passed on retry as flaky in `test-report.md` rather than counting it as a clean pass.
- Parallel workers only when each test's data is isolated; otherwise `workers: 1` (shared DB).

## Environment coordination

- Playwright is pre-installed in the Claude Code web environment. Do NOT run `playwright install`.
  If the project pins a different version, launch with `executablePath: '/opt/pw-browsers/chromium'`.
- If an app/service must be running to test → coordinate with the execute phase's pre-flight (ask the user
  to start it first).

## Covering the requirements

Every `AC-xx` (GIVEN/WHEN/THEN), `EC-xx`, and `NFR-xx` must have ≥1 test/check, or be explicitly listed as
manual-verify. Include an **AC/EC/NFR → test** table in the report. NFR testing varies by type: performance
(measure timing/load), security (attempt unauthorized access, injection), a11y (check roles/labels). If the
requirements include Regression Impact → add tests / re-walk the happy path of the affected existing features.

## Actually run them, don't assume

Once tests are written they MUST be run. Fail → fix → re-run until green — **scoped** to the file/test just
changed (the runner's file/pattern argument); run the whole suite once at the end of the leg, not per fix round. Smoke test the main endpoints: no 500s.
Mark each AC/EC row `verified: run|read`. Expected values in a test come from the spec, not from what the code
currently outputs. Triage any red result against commit history before spawning a fix.

## Self-review checklist before finalizing

- [ ] Does every AC/EC have a test or appear on the manual-verify list?
- [ ] Have the tests actually RUN and passed (not just been written)?
- [ ] Is everything pushed to "manual verification" genuinely un-automatable?
