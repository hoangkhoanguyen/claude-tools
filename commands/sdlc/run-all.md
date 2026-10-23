---
description: Run EVERY remaining sprint of a version to completion in one go, each sprint in its own fresh child session so the orchestrator conversation never fills up. Autonomous (no human gate). Resumable.
argument-hint: <version-slug> [sprint-a,sprint-b,…]
---

# /sdlc:run-all

Runs a whole version's sprints back-to-back **without the orchestrator conversation ever hitting the
1M-token ceiling**. The trick: this command does NOT run the phases itself. It spawns a **fresh child
session per sprint** (via the `claude-code-remote` MCP tools), each child runs the ordinary
`/sdlc:run <version> <sprint>` in its own clean 1M context, commits everything to disk + git, and reports
back a one-line status. The orchestrator holds only the sprint list + each sprint's pass/fail + any
blocker line — a few hundred tokens per sprint — so it can drive an entire version in a single session.

This is the "nhạc trưởng + mỗi sprint một child session" model. It is autonomous: it assumes **no human
gate** (gates auto-approve after the reviewer's `PASS`). Use `/sdlc:run` directly if you want to approve
each gate yourself.

## Why this exists

In one conversation, every subagent's **final report returns into the main context**. ~8 agents/sprint +
3 gate summaries + the Pre-manual Report, times N sprints, fills 1M after ~2-3 sprints. The plugin is
already state-driven and resumable (`.sdlc/<version>/state.md` + everything committed to git), so a
session boundary loses nothing. `/sdlc:run-all` just makes that boundary automatic: one child per sprint,
clean context each time, the orchestrator reads progress from **git**, not from child transcripts.

## Input

- `$1`: version slug (e.g. `v2`). If empty, read `.sdlc/versions.md` for the active version.
- `$2` (optional): a comma list of sprint slugs to limit/order the run (`sprint-1-auth,sprint-2-orders`).
  If empty, run **every sprint in `.sdlc/<version>/sprints.md` that is not `done`**, in dependency order.

## Preconditions — check ONCE, up front (the user answers, then can walk away)

A fully autonomous run has no human at the per-sprint gates or the services prompt, so settle these before
spawning anything:

1. **Orchestration tools available?** This command needs the `claude-code-remote` tools
   (`create_session`, `get_session`, `list_events`, `send_message`). If they are not in your toolset, load
   them with `ToolSearch` (`select:create_session,get_session,list_events,send_message`). If they still
   can't be loaded → tell the user this environment can't spawn child sessions, and fall back: run
   `/sdlc:run <version> <sprint>` for the sprints here in THIS session until context fills, then stop and
   have them re-run `/sdlc:run-all` in a new session (state on disk means it resumes). Do not pretend to
   orchestrate without the tools.
2. **Services for the whole run.** Spawn `preflight-scout` (`mode: services`) ONCE to get the full service
   table (ports + status + start commands, covering implement + test + qa) for the version's stack. Ask
   the user — one consolidated question — to start everything reported "not running", plus the Codex
   question if `codex: found, authenticated`. Wait for `ok`. A child cannot answer a services prompt, so
   anything still down later surfaces as `NEEDS_SERVICE`/`BLOCKED` and pauses the whole run. Record the
   confirmed list; you pass it to every child.
3. **Branch.** All children share ONE feature branch so each sees the previous child's commits. Determine
   it: the current branch if it is not the repo default, else ask once to create `sdlc/<version>` (in a
   non-interactive run, create it). Every child is spawned `source_revision` = this branch and
   `outcome_branch` = this branch, and is told in its prompt to stay on it.
4. **Confirm the plan.** Show the ordered sprint list you are about to run (slugs only, with each one's
   current status and dependencies) and the one services answer you got. One "ok" starts the whole run.
   After that, do not stop except for a blocker.

## Model & cost

There are TWO models in play, and conflating them is the easy mistake:

- **The orchestrator session** (where `/sdlc:run-all` runs) does almost no work per sprint — spawn a
  child, poll `get_session`, `git pull`, read a small `state.md`, relay one line. Its token use is
  negligible next to the children, so its model barely moves total cost. **Sonnet is the sensible default
  for it** — there is nothing here worth paying Opus for. (It is NOT holding the planning decisions; the
  children's gates auto-approve under no-human-gate.)
- **Each child session** consumes ~all the tokens, and its model sets the quality of phases 1-3 (which
  `inherit`). **Default the child to Opus** (passed explicitly on `create_session`, per the run loop
  below) so planning stays sharp; phases 4-6 are hard-pinned to Sonnet in frontmatter and stay cheap no
  matter what. This split — Opus plans, Sonnet executes — is already the cost-optimized shape; the
  expensive leg (execution) is the one that's cheap.

So "which model saves money?" → run the **orchestrator on Sonnet**, keep the **children on Opus**. Making
the orchestrator Opus wastes a little; making the children Sonnet saves real tokens but lowers planning
quality (an early mistake cascades into every later phase) — offer that only as an explicit user choice,
never as a silent default inherited from a cheap orchestrator.

## The run loop (strictly sequential)

For each sprint in order, skipping those already `done`:

1. **Dependency check** (read `.sdlc/<version>/sprints.md`; a cross-version dep → read the other version's
   `sprints.md`). If this sprint depends on one not yet `done` → skip it for now and come back after its
   dependency finishes; if the dependency can never be satisfied in this run → stop and report.
2. **Spawn the child.** `create_session` with:
   - `prompt`: `/sdlc:run <version> <sprint> — no human gate. Services already up: <list>. codex: <yes|no>. Stay on branch <branch>; commit and push .sdlc/ and code to it. Report the final sprint status (DONE / BLOCKED / DESIGN_GAP / NEEDS_SERVICE) in your last message.`
   - `source_revision` + `outcome_branch`: the shared branch (so the child starts from the latest pushed
     state and pushes back to it).
   - `permission_mode`: a non-interactive mode no more permissive than this session's (e.g. `acceptEdits`
     / `dontAsk`), so the child never stalls on a permission prompt. **Never `plan`** — it blocks forever
     waiting for a web approval no one will give.
   - environment inherited (omit `environment_id`).
   - **`model`: pass the PLANNING model explicitly — default Opus** (`claude-opus-...`). This is the one
     model choice that matters for the whole run, and it is NOT the orchestrator's own model (see "Model &
     cost" below). The child's phase 1-3 agents (`product-analyst`, `architect`, `ui-designer`,
     `task-breakdown`, `reviewer`) declare `inherit`, so they run on **the child session's** model; phases
     4-6 are hard-pinned to Sonnet in frontmatter regardless. `create_session` defaults the child's model
     to the CALLER's model, so **if you omit `model` and the orchestrator is on Sonnet, every sprint's
     planning silently drops to Sonnet** — exactly the cascade the plugin's model policy exists to prevent.
     Set it, don't inherit it. (The user may ask for Sonnet planning to cut cost further — then pass Sonnet;
     that is their explicit trade, not a silent default.)
   - a `title` like `run-all <version>/<sprint>` and a `tags: ["sdlc-run-all", "<version>"]` so the
     children are easy to find.
   Record the returned `session_id` against this sprint slug. **Spawn only one sprint at a time** — never
   run two sprints' Execute/Test/QA concurrently (shared git index, state, services).
3. **Wait for it.** Do NOT busy-poll with Bash `sleep`. The orchestrator gets a `<child-session-event>`
   turn if a child's turn fails or its worker restarts; a child that finishes cleanly does not report, so
   check it with `get_session` (`status_bucket`: `working` / `blocked` / `review_ready` / `completed` /
   `failed`). To cover the clean-finish case without polling tightly, arm one self check-in with
   `send_later` (schedules a message back into this session — a few minutes out, longer for big sprints);
   on each wake call `get_session`. While `working`, re-arm and stay idle. Stop waiting when it is
   `completed`/`failed`, or a `<child-session-event>` arrives.
4. **Read progress from git, not the transcript.** When the child is done: `git fetch` + `git pull` the
   shared branch, then read `.sdlc/<version>/state.md` (the `blockers` line + phase status) and
   `.sdlc/<version>/sprints.md` (this sprint's status). This is your source of truth — do **not**
   `list_events` the child's whole transcript into your context (grab at most the child's final message if
   you need its status line). Decide:
   - **Sprint `done`** (state clean, `sprints.md` says done) → relay one line to the user
     (`✅ <sprint> done`) and move to the next sprint.
   - **BLOCKED / DESIGN_GAP / NEEDS_SERVICE / failed** → the whole run pauses here. Read the one-line
     `blockers` from `state.md`, relay it to the user with what they need to do, and stop. These need a
     human decision (or a service started / a design patch) — do not retry blindly and do not skip ahead
     to a later sprint that might depend on this one. After the user resolves it, re-running `/sdlc:run-all`
     resumes from this sprint (state on disk).
5. **Continue** until every sprint is `done` or a blocker stops the run.

## Resume

`/sdlc:run-all <version>` is itself resumable: on re-run it reads `sprints.md`, skips sprints already
`done`, and continues from the first unfinished one — including one that was `BLOCKED` last time (now that
the user has resolved it). Children are resumable too: if a child died mid-sprint, the next child for that
sprint picks up from `state.md` exactly where `/sdlc:run` would.

## Context discipline for the orchestrator (the whole point)

The orchestrator conversation must stay tiny so it survives the entire version:

- Hold only: the ordered sprint slugs, each one's status, child `session_id`s, and the one-line blocker of
  a stopped sprint.
- Never relay Human Review blocks, never read `requirements.md` / `design.md` / `tasks.md` /
  `test-report.md` / the child transcripts. Per-sprint detail lives in `.sdlc/` (committed) and in each
  child's own session — look there if the user asks, don't pull it into the orchestrator.
- Report after each sprint in ONE line. Save the full Pre-manual Report for the user to read in the
  child's session (give them the `session_id` / title) rather than echoing it here.
- The orchestrator does not `git commit`/`push` sprint work and does not write `.sdlc/` artifacts — the
  children are the sole writers, exactly as subagents are in `/sdlc:run`. The orchestrator's only writes
  are the up-front branch creation (if any) and, at the end, confirming `versions.md` once the version is
  done (a child's handoff already does this for the last sprint; verify, don't duplicate).

## Handoff

When every sprint of the version is `done`:
- Confirm `.sdlc/versions.md` marks this version `done` (the last child's handoff sets it; verify after a
  final `git pull`).
- Present a short roll-up: each sprint ✅, and for each its child `session_id`/title so the user can open
  that session for the detailed Pre-manual Report (automatically covered / needs manual verification /
  undefined edge cases). Do not re-fetch those reports into this conversation.
- Remind: a new version is `/sdlc:sprint-plan <next-version> <docs>`.

If the run stopped at a blocker instead: report which sprints finished, which one is blocked and why (the
`blockers` line), and that re-running `/sdlc:run-all <version>` resumes from there once resolved.
