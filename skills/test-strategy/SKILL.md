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

## Decision table by feature type

| Feature type | How to test | Tooling |
|---|---|---|
| Pure logic (utils, calculations, validation) | Unit tests | the stack's test runner (jest/vitest/pytest/go test…) |
| API endpoint | Real HTTP calls, assert status + shape + business rules | curl / supertest / requests |
| UI flow (no 3rd party) | Drive the browser: navigate/fill/click/assert | Playwright (pre-installed) |
| Flow with a 3rd party (OAuth, payment) | Browser + sandbox/test mode | Playwright + Stripe test keys / OAuth sandbox |
| Webhook / async | Trigger + mock callback + verify the side effect | test runner + DB/state checks |
| UI with a design (DESIGN.md/ui-design.md) | Visual verification: screenshots checked against Design AC + baseline | Playwright + skill `design-fidelity` |
| Requires a real human (SMS OTP, Face ID, real money) | Can't be automated → list for manual verification | — |

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

Once tests are written they MUST be run. Fail → fix → re-run until green. Smoke test the main endpoints: no 500s.

## Self-review checklist before finalizing

- [ ] Does every AC/EC have a test or appear on the manual-verify list?
- [ ] Have the tests actually RUN and passed (not just been written)?
- [ ] Is everything pushed to "manual verification" genuinely un-automatable?
