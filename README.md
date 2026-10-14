# SDLC Workflow — Claude Code Plugin

A plugin that **drops into any project** so Claude can run the full development lifecycle sprint by sprint:
analyze requirements → design → break down tasks → **execute + automated testing** → clean handoff for manual QA.

Built for large projects, multi-feature work, or adding features to an existing codebase. **Stack-agnostic** — not tied to any language or framework.

---

## Philosophy

1. **Light review, trust downstream.** You only review a few priority sections at the top of each output; the rest is written for agent consumption, ensuring subsequent steps are done correctly.
2. **Each sprint is a closed loop.** Analyze → Design → Tasks → Execute → Test — one sprint completes before the next begins.
3. **Resumable.** Hit a limit or get interrupted mid-way → re-run the same command, it picks up exactly where it left off.
4. **Clean handoff.** When done, all minor bugs (validation, API errors, empty states…) have already been caught by automated tests. You only verify *business experience*, not debug.
5. **Self-review built in.** Each phase reviews its own output and cross-checks against the previous phase — no prompting needed.
6. **Leverages Claude's built-ins.** Subagents, TodoWrite, Bash, Playwright, Skills, Hooks — uses what's already there instead of reinventing.

---

## Installation

### Option 1 — `npx` (recommended, one-command online install)

From your **target project** directory, run:

```bash
npx github:hoangkhoanguyen/claude-tools
```

This fetches the installer from the `main` branch, copies `agents/`, `commands/`, `skills/`, `templates/`
and registers the `SessionStart` hook into your project's `.claude/`. You can use `/sdlc:*` immediately.

**Options:**

```bash
npx github:hoangkhoanguyen/claude-tools --global           # install into ~/.claude (all projects)
npx github:hoangkhoanguyen/claude-tools --dir ./path        # install into .claude at a custom path
npx github:hoangkhoanguyen/claude-tools --only skills       # install only a specific component
npx github:hoangkhoanguyen/claude-tools --skip hooks        # skip a specific component
npx github:hoangkhoanguyen/claude-tools --only claude-md    # add SDLC principles to CLAUDE.md
npx github:hoangkhoanguyen/claude-tools --dry-run           # preview what would happen, no writes
npx github:hoangkhoanguyen/claude-tools --list              # list available components
npx github:hoangkhoanguyen/claude-tools --help              # full options
```

Components: `agents`, `commands`, `skills`, `templates`, `hooks` (default) and
`claude-md` (opt-in — inserts SDLC principles into `CLAUDE.md` as a managed block).

**Safe when your project already has `.claude/`:**

- **Merge, not overwrite.** `settings.json` is merged (your existing permissions/hooks are preserved,
  only a SessionStart hook is added); `CLAUDE.md` only updates the content between two `sdlc-workflow`
  markers, leaving the rest of your file untouched.
- **Idempotent updates.** Re-run after a new release: files you **haven't modified** are updated automatically;
  files you **have edited** will prompt you
  (`--on-conflict ask|overwrite|skip|backup`, defaults to asking per file when a TTY is available).
  The installer tracks changes via `.claude/.sdlc-install.json` (checksums at install time) to know which files you've customized.
- **Backups available.** `--on-conflict backup` keeps the old version as `*.bak` before overwriting.

> **Private repo:** set `GITHUB_TOKEN` in your environment before running, or use
> `GITHUB_TOKEN=xxx npx github:hoangkhoanguyen/claude-tools`.

### Option 2 — Plugin directory (no file copying, update with `git pull`)

Clone the repo once and point Claude Code at it:

```bash
claude --plugin-dir /path/to/claude-tools
```

Or add it to your project's `.claude/settings.json` (copy from `templates/project-settings.json`):

```json
{
  "pluginDirs": ["/path/to/claude-tools"]
}
```

This approach **does not touch** your project's `.claude/`; to update just run `git pull` in the cloned repo.

The `/sdlc:*` slash commands will then be available in every session.

---

## Workflow

```
[Your business logic documentation — the plugin uses this as INPUT, it does not generate it]
[UI design (optional): existing DESIGN.md / external design handed to the design phase / or let the plugin figure it out]
          │
          ▼
  /sdlc:sprint-plan          ← reads your docs, splits into sprints
          │                     you review the sprint list + confirm tech stack per sprint
          ▼
  /sdlc:run <version> <sprint>         ← ONE command does everything for 1 sprint:
          │                     analyze → design → tasks → execute → test
          │                     (saves state after each step)
          ▼
  (hit a limit or interrupted?)
  /sdlc:run <version> <sprint>         ← re-run the same command → reads state, continues from where it stopped
          │
          ▼
  You manual test            ← verify business behavior only, no minor bugs to chase
```

Besides `run`, each phase also has its own command if you want to run steps individually:
`/sdlc:analyze`, `/sdlc:design`, `/sdlc:tasks`, `/sdlc:execute`, `/sdlc:test`.

`/sdlc:tasks` only creates documentation (breaks down tasks, no code) and generates `commands.md` listing run commands.
From there you have two execution options:
- **Task by task manually**: type `/sdlc:task` (no args) to pick an unfinished task from the list, or explicitly `/sdlc:task <version> <sprint> <task-id>`.
- **Run to completion**: `/sdlc:execute <version> <sprint>` — implements all tasks then immediately runs tests + QA gate + handoff.

`/sdlc:status` shows progress at any time. `/sdlc:replan` updates the sprint when business logic changes mid-flight without losing state.

---

## Where State Lives

The plugin writes everything to the `.sdlc/` directory in your project (committable so your team can see it and resume):

```
.sdlc/
├── versions.md              ← registry of versions (v1, v2…) + status
├── architecture.md          ← foundational architecture across versions (all sprints reference this)
├── design-system.md         ← design tokens across versions (when UI is involved — from DESIGN.md, external source, or derived)
├── sitemap.md               ← the project's navigation tree across versions (each UI sprint adds its screens)
└── <version>/               ← e.g. v1, v2
    ├── sprints.md           ← sprint list + tech stack + dependencies + status
    ├── state.md             ← resume pointer (fixed schema — see templates/state.template.md)
    └── <sprint-slug>/
        ├── requirements.md      ← analyze output (includes NFR + regression impact)
        ├── design.md            ← system design output (RULE/EC/NFR mapping table)
        ├── ux-map.md            ← screens (SCR-xx), flows (FLOW-xx), permissions, on-screen data/copy — when UI is involved
        ├── ui-design.input.md   ← (optional) external design handed in (markdown or Claude Design links) — ui-designer ingests it
        ├── ui-design.md         ← UI design output (tokens, component spec, Design AC, Design source header) — when UI is involved
        ├── design-source/       ← snapshot of the Claude Design canvas you approved — the visual reference for code + tests
        ├── tasks.md             ← task list + status (todo/doing/done)
        ├── commands.md          ← commands to run individual tasks / run to completion (generated at Tasks phase)
        ├── test-report.md       ← test results + items you need to verify manually
        └── visual-baseline/     ← screenshot baseline for visual regression — when UI is involved
```

> File format (md/json/…) is chosen by the agent to fit the content — not fixed. Only `state.md` follows a fixed schema
> (`templates/state.template.md`) to ensure reliable resume.

---

## Components

| Type | Name | Role |
|------|------|------|
| Command | `sprint-plan` | Split into sprints + create foundational architecture.md |
| Command | `run` | Run a full sprint, resumable |
| Command | `analyze` / `design` / `tasks` / `test` | Run individual phases (`tasks` only creates documentation) |
| Command | `task` | Execute a single task (no args → pick from list) |
| Command | `execute` | Run to completion: implement all tasks + test + QA + handoff |
| Command | `status` | Check progress |
| Command | `replan` | Update sprint when business logic changes, preserves state |
| Agent | `product-analyst` | Requirements → user stories, AC, business rules, edge cases, NFR, regression |
| Agent | `architect` | System design: API, DB, architecture, UI flow, NFR, regression-safe |
| Agent | `preflight-scout` | Reads config → service table with ports + status + startup commands + migrate commands (read-only) |
| Agent | `implement-coordinator` | Runs the full implement leg of a sprint: splits waves, delegates **batches** of related tasks, commits per task, writes state — context-isolated from main conversation; runs no repo-wide tests/lint/build, only one cheap whole-repo typecheck per wave (the rest is the Test leg's job) |
| Agent | `feature-builder` | Implements a batch of tasks (code + the unit/API tests each task owns) and reports per task, plus a code map for the next builder (state + commit written by caller) |
| Agent | `test-strategist` | Runs per layer (`integration` → `ui`, or `all` for small sprints): owns integration/e2e/visual tests, fills coverage gaps against the Test Plan; self-closes fix loop + commits |
| Agent | `qa-guard` | Final gate. **Lite** by default (clean-code scan, regression, Definition of Done, coverage check); **full** for auth/payment/PII sprints or when the Test leg changed source code; self-closes fix loop + commits |
| Agent | `ui-designer` | `draft`: UX map + design source (external / design system / DESIGN.md / existing app / ask user) → tokens, component spec, Design AC + a draft on a **Claude Design canvas**; `ingest`: reads the approved canvas back, snapshots it, finalizes `ui-design.md` |
| Agent | `task-breakdown` | Turns design (+ UI design) into `tasks.md` with batches, Test Plan and expected-value tests (the `architect` does this itself for sprints without screens) |
| Agent | `reviewer` | Independent cross-check of analyze/design/ui-design/tasks output against input |
| Skill | `requirements-analysis` | Output standard for the analyze phase |
| Skill | `ux-map` | Screen inventory, flows, sitemap, permissions, on-screen data/copy — settled before any UI is drawn |
| Skill | `system-design` | Output standard for the design phase |
| Skill | `task-breakdown` | How to break down tasks correctly without missing AC |
| Skill | `failure-ladder` | The single retry/escalation ladder (5 Sonnet rounds + 1 Opus round) shared by implement, test and QA fix loops |
| Skill | `codex-dispatch` | Optional Codex CLI offload for `Difficulty: normal` batches (loaded only when you opt in) |
| Skill | `test-strategy` | Test decision table by feature type |
| Skill | `design-fidelity` | Compares UI against DESIGN.md: tokens, contrast, responsive, dark/light |
| Skill | `self-review` | Self-review checklist after each phase |
| Hook | `SessionStart` | Prints in-progress SDLC state when a session opens (supports resume) |

---

## `/fix` — Standalone Bug-Fix Pipeline

A separate, generic tool bundled in this same install — does not depend on `.sdlc/` or any SDLC state.
Report a bug in any form (text, screenshot path, log file, stack trace) and it drives investigate → fix →
verify → commit until resolved, without you babysitting each step.

```bash
/fix "clicking Save on the profile form throws a 500" server.log
```

**Pipeline:**

1. `bug-investigator` reproduces the bug and pins down the root cause. Fixes it directly if trivial
   (1-2 lines, obviously safe); otherwise hands a confirmed root cause to the next step. Asks for more
   info instead of guessing when it can't reproduce the bug.
2. `bug-fixer` writes the patch and closes its own fix→test loop (up to 5 attempts, one continuous run —
   no cold-start between attempts). If still not fixed, the pipeline retries once with Opus, carrying the
   full attempt history so it doesn't repeat what already failed.
3. `bug-reporter` independently re-verifies the fix (doesn't trust the previous agent's word), commits it
   **locally only**, and gives you a short root-cause + diff + test summary.

The pipeline never pushes and never opens a PR — the local commit is the handoff point; you push when
you're ready.

| Type | Name | Role |
|------|------|------|
| Command | `fix` | Entry point — orchestrates the 3 agents below, branches on their status, relays the final report |
| Agent | `bug-investigator` | Reproduce → root cause; fixes trivial bugs itself |
| Agent | `bug-fixer` | Patch + self-contained fix→test loop; escalated to Opus by the caller if it gets stuck |
| Agent | `bug-reporter` | Independent verification + local commit + user-facing summary |

---

## Models: Opus Orchestrates, Sonnet Executes

Sprints are designed to run in one continuous pass without pausing for approval at each step — so models are allocated by **where mistakes are most expensive**. A wrong decision in an early phase cascades into every subsequent phase; wrong code in the execute phase gets caught and fixed by tests.

| Role | Model |
|---|---|
| Main session running `/sdlc:*` | **Opus** — you set this with `/model` |
| `product-analyst`, `architect`, `ui-designer`, `task-breakdown`, `reviewer` | `inherit` → runs the exact Opus version you chose |
| `preflight-scout`, `implement-coordinator`, `feature-builder`, `test-strategist`, `qa-guard` | **Sonnet** (hard-pinned) |

The subagent model is declared in each agent's `agents/*.md` frontmatter, so **this policy travels with the plugin when installed into another project** — no extra configuration needed. You just need to activate Opus for the main session with `/model` before running `/sdlc:sprint-plan`.

Phases 1-3 use `inherit` instead of pinning `opus` to respect the exact Opus version you chose (the `opus` alias resolves to the tier default, not necessarily the version you're actively using). Trade-off: **forget to activate Opus and phases 1-3 run on Sonnet**. Phases 4-6 hard-pin `sonnet` because their purpose is to *lower* the model regardless of what the main session is running — leaving `inherit` there would pull the entire execute leg up to Opus and erase all the speed/cost benefits.

### When Opus Gets Called Into the Execute Leg

The orchestrating agent promotes `feature-builder` to Opus autonomously, counted **per batch / per failure point**:

- Attempts 1-5 on Sonnet (each attempt respawns with the history of what was tried) → attempt 6 on Opus → still not done → `BLOCKED`.
- **Early escalation** if three consecutive attempts fail identically — repeating the same wrong direction generates no new information.
- **Opus from attempt 1** only for tasks marked `Difficulty: high` in `tasks.md` — now a narrow set: non-trivial algorithms, concurrency/idempotency/distributed transactions, cryptography/session-security design, migrations that rewrite existing data, permission/authorization logic, money/rounding/tax/currency math, timezone/calendar arithmetic, and rules an edge case marks as boundary-sensitive. Ordinary CRUD/service/UI work is `normal`; if a `normal` task fails, the retry ladder escalates to Opus anyway.
- `DESIGN_GAP` / `NEEDS_SERVICE` **do not count** against the attempt limit — a bigger model can't guess missing intent, and switching models when a service is down is pointless.

### Changing the Policy for Your Project

Edit the `model:` line in the relevant agent's frontmatter under `.claude/agents/`. The installer detects files you've modified (via checksums in `.sdlc-install.json`) and will ask before overwriting on a future install, so manual edits are safe.

### Optional: Offloading Implement Tasks to Codex CLI

If [OpenAI Codex CLI](https://github.com/openai/codex) is installed and authenticated on your machine,
`/sdlc:execute` and `/sdlc:run` detect it at pre-flight (`preflight-scout`) and ask **once per sprint**
whether to offload `Difficulty: normal` implement tasks to it — reducing Claude usage on the implement leg
without a manual step per task. `Difficulty: high` tasks and tasks with a `Suggested skill` always stay on
Claude. `implement-coordinator` dispatches qualifying tasks to `codex exec`, validates the diff + re-runs
the task's tests itself, and falls back to `feature-builder` (counted against the same Sonnet→Opus
escalation budget) if Codex fails validation twice. Answer "no" at pre-flight (or don't install Codex) to
keep the whole leg on Claude as before — this is opt-in, off by default.

---

## Projects With UI — Any Design Source Works

When a sprint has screens, UI is a requirement on par with business logic. The design phase runs two branches in parallel:
`architect` (system: API, DB) + `ui-designer` (interface). The ui-designer **does not invent aesthetics** — it identifies the design source **per screen** (uses whatever is provided externally, fills in the gaps itself):

| Situation | What ui-designer does |
|---|---|
| External design available (`.sdlc/<version>/<sprint>/ui-design.input.md` — from Claude Design / a designer) | **Ingest + normalize** into `ui-design.md` (adds Design AC/states/tokens where the external source is missing). Source: `external` |
| External design covers only some screens | Screens with designs → ingest; missing screens → **generate** following tokens from the external portion. Source: `mixed` |
| `DESIGN.md` / design system exists | Generate spec from it. Source: `internal` |
| **Existing project** (UI already running), no DESIGN.md | Follow the existing app's style — no asking, no style changes |
| **New project**, no source at all | Ask you once (have a DESIGN.md? / describe the style / let Claude decide) → **generates `DESIGN.md`** as the cross-sprint source |

### Claude Design in the loop

```
Analyze ─► UX map (screens, flows) ─► [analyze gate]
        ─► System design ∥ UI draft drawn on a Claude Design canvas
        ─► [design gate: open the canvas link, edit it in Claude Design, reply "ok"]
        ─► Ingest: canvas read back + snapshot ─► Tasks ─► Code ─► Test (vs the snapshot) ─► QA
```

- **No extra stops**: the UX map is reviewed at the analyze gate, the canvas at the design gate. With
  "no human gate" the draft is used as drawn and the sprint runs straight through.
- **What you edit is what gets built**: for visuals the canvas wins; if an edit contradicts an acceptance
  criterion, you're asked which one is right.
- **Recommended once per project**: run `/design-sync` to create a Claude Design design system from your
  codebase, so canvases use your real components and tokens.
- No claude.ai login (no `Artifact` tool) → the markdown spec alone, as before.

- **Design tokens normalized** into `.sdlc/design-system.md` (cross-sprint). Execute builds UI via tokens,
  NO hardcoded colors/spacing/fonts. Each screen is marked `[external]`/`[generated]` so you know which parts to compare against the original mockup.
- **Test phase includes visual verification**: Playwright captures screenshots and compares against Design AC + baseline →
  automatically catches "wrong color / broken layout / lost contrast".
- **qa-guard includes a design fidelity check** before handoff.

→ Result: when you manual test, you only assess *overall experience and aesthetics*, not *whether it matches the design*.

If a sprint has no screens, this branch shuts off automatically.

## Cost & Speed Design

Measured on ~33 real sprints (see `scripts/token-profile.py`), the plugin keeps its quality gates but cuts duplicated work:

- **Batches**: `task-breakdown` groups related tasks (dependency-chained or sharing files, max 3 — 2 for UI tasks) so one `feature-builder` handles them and commits per task — fewer cold starts. Builders pass a short code map forward so the next one doesn't re-explore.
- **Tests are planned up front**: the planning phase produces a **Test Plan** (AC/EC → unit/api/integration/e2e/visual/manual). Unit/API tests are written by the builder together with the code; the Test leg covers integration/e2e/visual and runs per layer with a smaller context.
- **Lean QA**: `qa-guard` trusts a green full test run at the same commit instead of repeating it; the full checklist still runs for sensitive sprints or when tests had to fix source.
- **Early service check**: `/sdlc:run` asks which services to start (and the Codex question) once, at the start, so you can walk away.
- **Planning in one pass**: for sprints without screens the `architect` writes `design.md` and `tasks.md` together; sprints with screens keep a separate task pass so tasks carry the UI Design AC.
- **Optional pipeline** (off by default): only when you explicitly say "pipeline" / "song song" and the sprints are independent, the next sprint's analyze/design/tasks run while the current one executes. A plain list like "sprint 22,23,24" runs strictly one after another.

To measure the effect of any change: `python3 scripts/token-profile.py ~/.claude/projects/<encoded-project-path>` (run from a clone of this repo; it is not installed into projects) before and after, and watch the quality signals it prints (retries, source fixes made by the Test/QA legs).

## The "No Minor Bugs During Manual Test" Guarantee

Before declaring a sprint done, `qa-guard` ensures:

- Every task has passed its own tests (not saved until the end)
- API endpoints have been smoke-tested (no 500s / failed calls)
- No unhandled exceptions, no hardcoded credentials, no leftover TODOs
- Every edge case defined in requirements has handling + a test
- Each user story is either covered by an end-to-end/integration test or walked through by QA — no errors on the happy path

→ The final report clearly separates 3 groups: **automatically covered** / **needs your manual verification** / **undefined edge cases** (if any).
