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
└── <version>/               ← e.g. v1, v2
    ├── sprints.md           ← sprint list + tech stack + dependencies + status
    ├── state.md             ← resume pointer (fixed schema — see templates/state.template.md)
    └── <sprint-slug>/
        ├── requirements.md      ← analyze output (includes NFR + regression impact)
        ├── design.md            ← system design output (RULE/EC/NFR mapping table)
        ├── ui-design.input.md   ← (optional) external design handed in — ui-designer ingests this into ui-design.md
        ├── ui-design.md         ← UI design output (tokens, component spec, Design AC) — when UI is involved
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
| Agent | `implement-coordinator` | Runs the full implement leg of a sprint: splits waves, delegates tasks, commits, writes state — context-isolated from main conversation |
| Agent | `feature-builder` | Implements individual tasks and reports results (state + commit written by caller) |
| Agent | `test-strategist` | Chooses test strategy by stack + writes/runs tests; self-closes fix loop + commits |
| Agent | `qa-guard` | Catches minor bugs + regression + NFR, confirms clean before handoff; self-closes fix loop + commits |
| Agent | `ui-designer` | Design source (external / DESIGN.md / existing app / ask user) → tokens, component spec, Design AC (when UI is involved) |
| Agent | `reviewer` | Independent cross-check of analyze/design/ui-design output against input |
| Skill | `requirements-analysis` | Output standard for the analyze phase |
| Skill | `system-design` | Output standard for the design phase |
| Skill | `task-breakdown` | How to break down tasks correctly without missing AC |
| Skill | `test-strategy` | Test decision table by feature type |
| Skill | `design-fidelity` | Compares UI against DESIGN.md: tokens, contrast, responsive, dark/light |
| Skill | `self-review` | Self-review checklist after each phase |
| Hook | `SessionStart` | Prints in-progress SDLC state when a session opens (supports resume) |

---

## Models: Opus Orchestrates, Sonnet Executes

Sprints are designed to run in one continuous pass without pausing for approval at each step — so models are allocated by **where mistakes are most expensive**. A wrong decision in an early phase cascades into every subsequent phase; wrong code in the execute phase gets caught and fixed by tests.

| Role | Model |
|---|---|
| Main session running `/sdlc:*` | **Opus** — you set this with `/model` |
| `product-analyst`, `architect`, `ui-designer`, `reviewer` | `inherit` → runs the exact Opus version you chose |
| `preflight-scout`, `implement-coordinator`, `feature-builder`, `test-strategist`, `qa-guard` | **Sonnet** (hard-pinned) |

The subagent model is declared in each agent's `agents/*.md` frontmatter, so **this policy travels with the plugin when installed into another project** — no extra configuration needed. You just need to activate Opus for the main session with `/model` before running `/sdlc:sprint-plan`.

Phases 1-3 use `inherit` instead of pinning `opus` to respect the exact Opus version you chose (the `opus` alias resolves to the tier default, not necessarily the version you're actively using). Trade-off: **forget to activate Opus and phases 1-3 run on Sonnet**. Phases 4-6 hard-pin `sonnet` because their purpose is to *lower* the model regardless of what the main session is running — leaving `inherit` there would pull the entire execute leg up to Opus and erase all the speed/cost benefits.

### When Opus Gets Called Into the Execute Leg

The orchestrating agent promotes `feature-builder` to Opus autonomously, counted **per task / per failure point**:

- Attempts 1-5 on Sonnet (each attempt respawns with the history of what was tried) → attempt 6 on Opus → still not done → `BLOCKED`.
- **Early escalation** if three consecutive attempts fail identically — repeating the same wrong direction generates no new information.
- **Opus from attempt 1** for tasks marked `Difficulty: high` in `tasks.md` (algorithms, concurrency, distributed transactions, cryptography, refactors with wide regression risk).
- `DESIGN_GAP` / `NEEDS_SERVICE` **do not count** against the attempt limit — a bigger model can't guess missing intent, and switching models when a service is down is pointless.

### Changing the Policy for Your Project

Edit the `model:` line in the relevant agent's frontmatter under `.claude/agents/`. The installer detects files you've modified (via checksums in `.sdlc-install.json`) and will ask before overwriting on a future install, so manual edits are safe.

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

- **Design tokens normalized** into `.sdlc/design-system.md` (cross-sprint). Execute builds UI via tokens,
  NO hardcoded colors/spacing/fonts. Each screen is marked `[external]`/`[generated]` so you know which parts to compare against the original mockup.
- **Test phase includes visual verification**: Playwright captures screenshots and compares against Design AC + baseline →
  automatically catches "wrong color / broken layout / lost contrast".
- **qa-guard includes a design fidelity check** before handoff.

→ Result: when you manual test, you only assess *overall experience and aesthetics*, not *whether it matches the design*.

If a sprint has no screens, this branch shuts off automatically.

## The "No Minor Bugs During Manual Test" Guarantee

Before declaring a sprint done, `qa-guard` ensures:

- Every task has passed its own tests (not saved until the end)
- API endpoints have been smoke-tested (no 500s / failed calls)
- No unhandled exceptions, no hardcoded credentials, no leftover TODOs
- Every edge case defined in requirements has handling + a test
- Walking through the happy path of each user story hits no errors

→ The final report clearly separates 3 groups: **automatically covered** / **needs your manual verification** / **undefined edge cases** (if any).
