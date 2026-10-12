---
description: Run execution TO COMPLETION for one sprint — pre-flight, implement every task, then Test + QA gate + handoff. Use it once tasks exist (e.g. after /sdlc:run stopped at the Tasks gate).
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:execute

Run execution TO COMPLETION for sprint `$2` in version `$1`
(if empty, read from `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

Three legs: **Implement → Test → QA gate + handoff**. This is "execute to completion" — it runs from the
planned tasks all the way to a clean handoff. To run exactly one task → use `/sdlc:task`.

Requires `.sdlc/<version>/<sprint>/tasks.md` to exist (run `/sdlc:tasks` first if not).
Resume: skip legs/tasks already `done`, continue exactly where it left off.

## This command's context — deliberately reads very little

This command **writes no code, no design, and no task breakdown** — it only orchestrates 3 subagents and
talks to the user. Every execution agent (`implement-coordinator`, `feature-builder`, `test-strategist`,
`qa-guard`) globs the relevant `CLAUDE.md` itself, reads `architecture.md`/`design.md` itself, and scans
the repo's skills itself at startup. Reading those again means paying twice, the second time out of a
context that has to survive all 3 legs.

You ONLY read: `.sdlc/<version>/state.md` (resume), `.sdlc/<version>/sprints.md` (handoff), and a
**targeted Grep** into `.sdlc/<version>/<sprint>/tasks.md` for the IDs + description lines of unfinished
tasks. Do NOT Read all of `tasks.md` — grep only the ID + description lines. Also read `has_ui` /
`required_layers` / `test_layers_done` / `sprint_branch` from `state.md` (resume) — never from
`requirements.md`.

## Model policy

Run this command on **Opus** (it holds the decisions across all 3 legs); if the session is on another model,
carry on. All 4 agents here (`preflight-scout`, `implement-coordinator`, `test-strategist`, `qa-guard`) are
pinned to Sonnet in their frontmatter, so do NOT pass `model` when spawning. Escalating to Opus is the
execution agents' job (skill `failure-ladder`); `BLOCKED` means a human decision is needed, not a bigger
model. If the user explicitly asks to run it differently, follow the user.

## Pre-flight (REQUIRED before writing code)

(Standalone command: runs the scout in `full` mode — services + migration + codex. If `services_up` (with
`services_up_sprint` equal to THIS sprint) and `codex_enabled` are already recorded in `state.md` — e.g.
`/sdlc:run` did the early check — skip the service/Codex questions and run `migration` mode only, passing
the exact `services_up` list: the scout re-pings every one, reports any down, plus the delta of newly
required services and the migrate command. A `services_up` from a different sprint is stale → `full`.)

1. **Spawn `preflight-scout`** with `mode: full`, or `mode: migration` per the rule above (read-only). It reads `docker-compose.yml`, `.env.example`, `package.json`
   scripts, `Procfile`, `Makefile`, and the README for you, pings ports itself, and returns a compact
   table: service + port + status + start command + migrate command. You do not read that pile of config.
2. **Confirm services for ALL 3 LEGS in one pass.** The scout's table already includes the dev
   server/sandbox that Test and QA need, not just the services needed during implement. Ask the user to
   start everything at once — asking incompletely here means legs 2/3 return `NEEDS_SERVICE`, and every
   respawn is a cold-start agent re-reading context from scratch.
3. ONLY ask the user to start what the scout reports as "not running", with the start command it
   provided. WAIT for the user to confirm "ok". Write `services_up` (`none` explicitly when nothing is
   needed) and `services_up_sprint: <sprint>` into `.sdlc/<version>/state.md`. (If the sprint is new, also
   reset `test_layers_done` and `required_layers`.)
4. **Migration**: run the migrations that already exist in the repo now (after the DB is up) and record it in
   state. Migrations this sprint adds are run after the coordinator returns `DONE` (see Leg 1).
5. **Codex offload (optional, ask ONCE per sprint here — not per task)**: if the scout reports
   `codex: found, authenticated`, ask the user in the SAME confirmation turn as the services check (don't
   spend a separate round-trip):
   > Codex CLI is available. Offload `Difficulty: normal` implement tasks to it (fallback to Claude on
   > failure) to save your Claude usage? [yes/no]

   Answer format: `ok` plus an optional `codex: yes|no`; plain `ok` = no. Write the answer as `codex_enabled: true|false` into `.sdlc/<version>/state.md`. If the scout reports
   `not found` or `not authenticated`, skip asking — just write `codex_enabled: false` silently (don't
   nag the user to install something they haven't asked for).

6. **Sprint branch**: record `sprint_branch` in state = the current branch if it is not the default branch
   (main/master/the repo's default). On the default branch → ask the user once: "on `<branch>`; create
   `sdlc/<version>-<sprint>`? yes/no". You never switch branches otherwise.
7. **Commit the planning artifacts** (no execution agent is running yet):
   `git add .sdlc && git commit -m "docs(<sprint>): planning artifacts"`.

Pre-flight is where you write `state.md` in this command (plus `required_layers` at the start of Leg 2,
`migration_done` after Leg 1, and the `NEEDS_SERVICE` rule below) — from leg 1 onward, while an agent runs,
it owns that file.

## Leg 1 — Implement (hand off entirely to `implement-coordinator`)

This leg is the noisiest (per-task reports + commits + state writes). Don't run it in this conversation —
**spawn subagent `implement-coordinator`** to isolate the context and save room for legs 2 + 3.

Before spawning: sync TodoWrite once (one item per unfinished task) so the user sees the scope — get the
IDs + descriptions with the targeted Grep described above, don't Read all of `tasks.md`.

Pass the coordinator: `version`, `sprint`, `sprint_branch`, the `services_up` confirmed at pre-flight, and
`codex_enabled` (from state). The coordinator will: split into waves by dependency → assign work to
`feature-builder` per **batch** (`Batch: B<n>` in `tasks.md`; batching rules and the retry budget live in
the coordinator and skill `failure-ladder`) or, if `codex_enabled` and the batch qualifies, to Codex CLI →
commit per task (one combined commit when tasks share a file) → update `tasks.md` + `state.md`. It runs no
repo-wide tests/lint/build (only one whole-repo typecheck per wave).

**While the coordinator runs, do NOT touch `tasks.md`, `state.md`, or the git index** — it is the sole
writer for this leg. Two concurrent writers is the classic source of corrupted state.

The coordinator returns a status on its first line; handle it per this table:

| Status | What you do |
|---|---|
| `DONE` | If the sprint added migrations (scout `migration` output / the design's File Change Plan), run the migrate command again and record `migration_done` in state. Refresh TodoWrite, move to leg 2 |
| `BLOCKED` | A human decision is needed (includes "branch mismatch"). STOP, report the blocker to the user. Do not proceed to Test |
| `DESIGN_GAP` | **You decide, `architect` writes.** Small & clear gap → spawn `architect` with the gap description to patch `design.md` (don't read `design.md` yourself — it's the largest file in the sprint); the patch then amends `tasks.md` for UNFINISHED tasks only and `design` leaves `reviewer_passed`. Reason "tasks.md batching" → spawn the `task-breakdown` agent by name to regenerate the batches, not `architect`. Large gap / scope change → suggest `/sdlc:replan`. Done → spawn a fresh coordinator |
| `NEEDS_SERVICE` | Ask the user to start the service (with the suggested command), wait for "ok", record it in `services_up` (+ `services_up_sprint`) — the ONLY thing you may write to `state.md` while no execution agent is running — then spawn a fresh coordinator |
| `CONTEXT_LIMIT` | Spawn a fresh coordinator immediately — progress is on disk, so it picks up exactly where it left off |

Relay the coordinator's report to the user as a short summary (the user doesn't see subagent output).

Only move to leg 2 on status `DONE`.

## Leg 2 — Test (by layer)

First compute `required_layers` and write it into `state.md` (no execution agent is running): `has_ui: yes`
→ `[integration, ui]`; no UI → `[all]`; legacy sprint (no Test Plan in `tasks.md`, or an old `test-report.md`
without layer sections) → `[all]`. If `has_ui` isn't in state, derive it from whether `ui-design.md` exists
(`design_ui` not `n/a`). Spawn subagent `test-strategist` (skill `test-strategy`) once per layer in
`required_layers` **not already in `test_layers_done`** (absent = `[]`), sequentially, each with a fresh
context — pass `layer`:
- UI sprint → `integration` then `ui` (regardless of task count). No UI → one `all` pass.
- `integration`: api/integration/3rd-party/webhook/DB-side-effect items + gap-filling (builders already wrote
  the unit/api tests listed in each task's `Tests:`; it verifies coverage of the Test Plan, not rewrites).
- `ui`: e2e (Playwright) + visual verification (skill `design-fidelity`): screenshots compared against
  Design AC + the baseline in `.sdlc/<version>/<sprint>/visual-baseline/`.
It writes tests and ACTUALLY RUNS them until green. Every AC/EC/NFR/DAC must have a test or be listed as
manual-verify. Each layer updates its own section of `.sdlc/<version>/<sprint>/test-report.md`; the agent
records `test_layers_done` and the last required layer sets `test: done`.

**Each layer closes its own fix loop and commits its own test files + fixes.** You do NOT orchestrate the fix loop and do NOT touch the git index while it runs —
pushing the fix loop back here is a major context sink in the main conversation.
Handle the status it returns using the same table as leg 1 (`DONE` → next layer / leg 3; `BLOCKED` → stop
and report; `DESIGN_GAP` / `NEEDS_SERVICE` / `CONTEXT_LIMIT` → resolve then respawn that layer). Relay a
short summary to the user.

## Leg 3 — QA gate + handoff

Spawn subagent `qa-guard`. It picks lite or full mode itself, closes its own fix loop and commits itself; its
first report line is `QA mode: lite|full — <reason>`. You only receive the status; you don't fix anything
and don't touch git. Only on status `DONE` do you hand off:

- Set the sprint to `done` in `.sdlc/<version>/sprints.md`; if every sprint in the version is `done` →
  set the version to `done` in `.sdlc/versions.md`.
- Present the Pre-manual Report, first line = qa-guard's `QA mode: lite|full — <reason>` line, then: automatically covered / needs manual verification / undefined edge cases.
- Remind the user: next sprint `/sdlc:run <version> <sprint-slug>`; new version `/sdlc:sprint-plan <version>`.

## This command's boundaries (re-read this if you're tempted to "speed things up")

At the end of each leg you do **NOT** run the `self-review` skill and do **NOT** update `state.md`:

- Every agent has its own REQUIRED self-review section and runs it before returning results.
- From leg 1 onward `state.md` belongs to the running agent (coordinator / test-strategist / qa-guard).
  Writing to it too creates two writers on one file — exactly what this design avoids.

Your job after each leg is only: read the status on the report's first line → handle it per the table →
relay a short summary to the user. Beyond that, throughout this command you do not `git add`/`commit`/
`push`, and you do not edit `design.md` / `requirements.md` / `tasks.md`.

The only exceptions: pre-flight (writing `services_up` / `services_up_sprint` / `codex_enabled` /
`sprint_branch` and the planning-artifacts commit), `required_layers` at the start of Leg 2,
`migration_done` after Leg 1, the `NEEDS_SERVICE` write while no execution agent is running, and handoff
(`sprints.md`, `versions.md`).
