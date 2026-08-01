# SDLC Workflow Plugin — Guide for Claude

This plugin orchestrates the software development lifecycle sprint by sprint. When it's active,
apply the principles below to EVERY `/sdlc:*` command.

## Core principles (apply throughout)

0. **ALWAYS read the project's context in EVERY phase — before doing anything.** At the start of each
   command/phase:
   - **Identify the `CLAUDE.md` files relevant to the work at hand.** A project may have MANY `CLAUDE.md`
     files (root + nested in each module/package). Don't read them all blindly, and don't read only the
     root. The method:
     1. Glob the whole repo to list every `CLAUDE.md` (and `AGENTS.md`/`.cursorrules` if present).
     2. JUDGE FOR YOURSELF which ones are relevant to the current phase/task scope: always read the root
        file (general context); plus any `CLAUDE.md` in directories this sprint/task will touch (per the
        File Change Plan in the design). Skip CLAUDE.md files for unrelated modules.
     3. Inheritance rule: more deeply nested files override/extend the root file for their directory
        scope — on conflict, the file closer to the code wins.
   - Learn the conventions, rules, constraints, and build/test commands from the files you selected.
     Follow them absolutely.
   - Detect & use the skills/commands/agents already in the repo (see principle 7).
   Never assume conventions — always confirm from the relevant CLAUDE.md and the codebase first.

1. **The input is the user's existing business logic documentation.** The plugin does NOT generate
   business logic docs — the user supplies them (a file, a path, or a pointer). Your job starts from
   splitting into sprints onward.

2. **Sprint-first.** For large projects: split into sprints FIRST, then analyze/design/task EACH sprint.
   Never analyze the entire project at once — the user would be overwhelmed reviewing it.

3. **Two-layer review.** Every output has a "Human Review" section first (short, at the top of the file)
   and an "Agent Reference" section after (detailed, for downstream agents). Users usually read only the
   first part. So the second part MUST be explicit enough that the next agent never has to guess.

4. **State-driven & resumable.** Before doing anything in `/sdlc:run`, READ `.sdlc/<version>/state.md` to
   know where you are. After EVERY unit of work (each task, each phase), UPDATE the state immediately.
   If interrupted, the next run must continue in exactly the right place — never redoing finished work.

4a. **`.sdlc/` location — always at the repo root.** Never nested inside a sub-package or sub-app.
    Structure: `.sdlc/versions.md`, `.sdlc/architecture.md`, `.sdlc/design-system.md` at the root
    (cross-version); everything else per version: `.sdlc/<version>/state.md`, `.sdlc/<version>/<sprint>/`.
    For a multi-app monorepo: still one single `.sdlc/` at the root; sprint slugs reflect the relevant app
    (e.g. `sprint-1-web-auth`, `sprint-2-api-orders`) to tell them apart.

4b. **`.sdlc/` is always committed to git — the whole team sees it.** On first initialization
    (`/sdlc:sprint-plan`), add this line to the project's `.gitignore` to exclude the heavy/unnecessary part:
    ```
    .sdlc/*/*/visual-baseline/
    ```
    Everything else (`versions.md`, `sprints.md`, `state.md`, `architecture.md`, `design-system.md`, and
    every `requirements.md`, `design.md`, `ui-design.md`, `tasks.md`, `test-report.md`) gets committed —
    this is the project's living documentation, reviewable by the team through PRs, with clear history.

5. **Self-review — without the user asking.** After each phase, run the checklist in the `self-review`
   skill yourself. Don't treat "finished" as "good enough". Always ask: "is this output sufficient for the
   next step? does it contradict the previous phase?". If something's missing, add it BEFORE writing the
   file / reporting done.

6. **Clean handoff.** The end goal: when the user manual tests, they ONLY verify business behavior and
   hit NO minor bugs (validation, API 500s, empty states, crashes…). Anything automatable must be tested
   automatically before reporting done.

7. **Detect & use the skills already in the repo.** Before doing something the default way, scan the
   PROJECT's `.claude/skills`, `.claude/agents`, `.claude/commands`, skills from `pluginDirs`, and the
   built-in skills available in the session. Read the descriptions; if one matches the work at hand, USE
   it via the Skill tool. Prefer the project's skills over the default approach, because they encode the
   team's own conventions. This applies in every phase, especially execute (code generation) and test (the
   project's own test skills).

## Use Claude's built-ins (required preference)

- **TodoWrite**: use it to track tasks within the session during execute; sync out to
  `.sdlc/<version>/<sprint>/tasks.md` to persist across sessions.
- **Subagents (Agent tool)**: each phase should spawn its corresponding specialized agent
  (product-analyst, architect, implement-coordinator → feature-builder, test-strategist, qa-guard).
  The implement leg is handed off ENTIRELY to `implement-coordinator` — it is the sole writer (commits,
  `tasks.md`, `state.md`) and assigns each task to `feature-builder` itself, so the main conversation
  spends no context on the report-commit-write-state loop. By the same principle, `test-strategist` and
  `qa-guard` close their OWN fix loops (max 5 Sonnet rounds + 1 Opus escalation round, then stop) and
  commit THEMSELVES — the main conversation never orchestrates a fix loop or touches the git index while
  an execution agent is running; it only receives the status on the report's first line
  (`DONE` / `BLOCKED` / `DESIGN_GAP` / `NEEDS_SERVICE` / `CONTEXT_LIMIT`) and acts accordingly;
  plus `ui-designer` for the interface branch when a sprint has screens (design source: external design /
  DESIGN.md / the existing app's style / ask the user); and `reviewer` for an independent cross-check
  after analyze/design. Run them in parallel when the parts are independent; isolate each phase's context.
- **Built-in design skills**: `artifact-design` (interface principles), `dataviz` (charts/dashboards) —
  use these in the ui-designer branch.
- **Bash**: ping ports to detect running services; run test runners; smoke test APIs with curl.
- **Playwright** (pre-installed in the environment): automate UI testing. Do NOT run `playwright install`.
- **Skills**: load the appropriate skill per phase (included in this plugin).
- **Hooks**: the `SessionStart` hook prints the in-progress SDLC state (`.sdlc/<version>/state.md`) to
  support resuming (see `hooks/`).

## Model policy (Opus orchestrates — Sonnet executes)

A sprint runs in one continuous pass without pausing for step-by-step approval, so models must be
allocated by **where mistakes are most expensive**: a wrong decision in an early phase is inherited by
every later phase, whereas wrong code in the execution phase is caught and fixed by tests.

**The model is already declared in each agent's frontmatter (`agents/*.md`)** — that's the source of
truth, and it travels with the plugin when installed into another project. The main conversation does NOT
pass a `model` parameter when spawning, so it never overrides the policy.

| Role | Model | Why |
|---|---|---|
| Main conversation (`/sdlc:*`) | user's choice — should be **Opus** | Holds every decision + approval gate, lives across all 6 phases |
| `product-analyst`, `architect`, `ui-designer`, `reviewer` | `inherit` | Phases 1-3: one mistake here is inherited by every later phase → run the exact model the user chose |
| `preflight-scout` | sonnet | Reading config, pinging ports — mechanical work |
| `implement-coordinator` | sonnet | Splitting waves + committing + writing state, following an existing process |
| `feature-builder` | sonnet | Has the design + a clear task spec in hand |
| `test-strategist`, `qa-guard` | sonnet | Running checklists, writing tests per a decision table |

**Why phases 1-3 use `inherit` rather than pinning `opus`:** the `opus` alias resolves to the tier's
default Opus build, which isn't necessarily the one the user actively chose in the main conversation.
`inherit` respects that choice — whichever Opus the user picked, these 4 agents run it. The consequence to
know: **if the main conversation runs Sonnet, phases 1-3 run Sonnet too.** That's why `/sdlc:sprint-plan`
reminds the user to switch to Opus right at the entry point.

Phases 4-6 are the opposite — hard-pinned to `sonnet`, NOT `inherit`, because their whole purpose is to
**lower** the model regardless of what the main conversation is running. Leaving `inherit` here would drag
the entire execution leg up to Opus and erase the speed/cost benefit this design targets.

### Escalating to Opus — decided by the execution agent

The orchestrating agents (`implement-coordinator`, `test-strategist`, `qa-guard`) promote
`feature-builder` to Opus themselves via the `model` parameter of the `Agent` tool. The budget is counted
**per task / per failure point**, not pooled across the sprint:

- **Attempts 1-5: Sonnet.** On each failure, respawn including the **history of what was tried** — the
  agent cold-starts every time, and without the history it repeats the same mistakes and burns the entire
  budget on one approach.
- **Attempt 6: Opus**, the final attempt. Still not done → `BLOCKED`, a human decision is needed.
- **Escalate early**: three consecutive identical failures (same red test, same error, same file) → go to
  Opus immediately, don't wait for all 5. Repeating a wrong approach produces no new information.
- **Use Opus from the first attempt** when a task is marked `Difficulty: high`, or touches algorithms /
  concurrency / distributed transactions / cryptography — work where being slightly wrong fails silently
  and tests struggle to catch it.
- **`DESIGN_GAP` and `NEEDS_SERVICE` do NOT count against the budget.** A bigger model can't guess intent
  from a missing design, and switching models is meaningless when a service isn't running. Stop and fix
  the actual root cause.

Once you receive `BLOCKED`, **do not respawn with Opus** — the escalation budget was already spent before
that status reached the main conversation.

### Changing the policy for a specific project

Edit the `model:` line in the corresponding agent's frontmatter under the project's `.claude/agents/`. The
installer detects files you've edited and will ask before overwriting on a future install, so hand-editing
is safe.

## Pre-flight before execute (VERY IMPORTANT)

Before writing the first line of code in execute:
1. Detect & prefer the skills already in the repo (principle 7) — **this is the execution agent's job**,
   each agent scans for itself at startup. The main conversation does not scan on their behalf (see
   "Context discipline" below).
2. **Spawn `preflight-scout`** to infer external services/tools FROM THE PROJECT CONFIG (docker-compose,
   .env.example, package.json scripts, Procfile, Makefile, README) — not from guesswork. It returns a
   table of services + ports + status (pinged itself) + start commands + migrate commands. The main
   conversation does NOT read that pile of config itself.
3. Confirm services for the **whole execution stretch** (implement + test + qa) in one pass — the dev
   server and sandboxes that Test/QA need must be on the list too, not just the services needed during
   implement.
4. ONLY ask the user to start what the scout reports as "not running", with the suggested commands it provided.
5. Wait for the user to confirm ("ok"/"done") BEFORE continuing. Never assume services are ready. Record
   the confirmed services in `.sdlc/<version>/state.md`.
6. **DB migration/seed**: if the sprint changes the schema (new models/migrations), determine the
   project's migrate command (from config: `package.json`, `Makefile`, the framework CLI) and RUN it
   before testing — an unmigrated schema is the classic source of "minor bugs" (API 500s) during manual
   testing. Record the migration run in state.

## Context discipline for the main conversation (applies THROUGHOUT the sprint, not just execute)

From phase 1 (Analyze) onward, the main conversation has only 2 roles: **orchestrating subagents** and
**talking to the user**. It doesn't analyze, doesn't design, doesn't break down tasks, doesn't write code —
so it does NOT read on anyone's behalf. This rule used to apply only to the execute leg, but in practice
phases 1-3 are where the main conversation most easily dies of context exhaustion (business docs + many
CLAUDE.md files + codebase exploration).

**Principle 0 (reading the relevant CLAUDE.md) applies to the AGENT executing that phase, not the main
conversation.** Each subagent starts cold and globs/reads the CLAUDE.md for its own scope. The main
conversation only passes paths + slugs + the Human Review blocks it receives back.

- Do **not** Glob/read the project's `CLAUDE.md`, `architecture.md`, `requirements.md`, `design.md`, or the
  user's business docs; do not scan the repo's skills; do not survey the codebase. Every agent
  (product-analyst, architect, ui-designer, the task-breakdown agent, implement-coordinator,
  test-strategist, qa-guard, reviewer) starts cold and loads it all itself. Reading it again means paying
  twice.
- Do **not** Read all of `tasks.md` just to sync TodoWrite — use the ID+description list the agent
  returned, or a targeted Grep.
- Do **not** read a file to summarize it for the user: the agent producing a file MUST return a ready
  Human Review block for the main conversation to relay verbatim.
- In phases 1-3, self-review is the subagent's own final step before returning the file — the main
  conversation does NOT run the `self-review` skill on its behalf.
- Do **not** write `state.md`, do not `git add/commit/push`, and do not edit artifacts (`design.md`,
  `requirements.md`, `tasks.md`) while an execution agent is running — that agent is the sole writer.
  Need to patch `design.md` after a `DESIGN_GAP`? → the decision belongs to the main conversation, but
  **`architect` does the writing**.

Permitted exceptions to writing: pre-flight (`services_up`) and handoff (`sprints.md`, `versions.md`).

## Choosing a test strategy (auto-detected)

See the `test-strategy` skill. The principle: automate as much as possible. Only flag something as
"needs manual user verification" when it truly can't be automated (real SMS OTP, Face ID, real money…).

## When to ask the user

- The sprint list after `sprint-plan` (so the user can reorder / confirm the tech stack).
- Open Questions in analyze that you can't resolve safely yourself.
- UI design, **new project with no aesthetic source yet**: ask once about the style direction (is there a
  DESIGN.md? / describe the tone-color-reference app / let Claude decide) then settle it into `DESIGN.md`.
  For an existing project, do NOT ask — follow the current app. If a sprint expects an external design
  that hasn't arrived yet → ask/wait (`waiting-external`).
- Pre-flight: requesting that external services be started.
- Beyond these points, in `/sdlc:run` run as automatically as possible; report briefly after each phase
  and continue.
