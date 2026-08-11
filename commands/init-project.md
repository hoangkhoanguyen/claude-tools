---
description: Take a prepared tech stack file → research the current official docs for each technology → scaffold the missing apps the way those docs recommend → write CLAUDE.md for the root and each app.
argument-hint: [path to tech stack file]
---

# /init-project

Take a prepared tech stack file, then for EVERY technology in it, **look up the current official
documentation yourself, decide the correct way to scaffold, and do it** — so the later `/sdlc:run`
sprints build on a clean, correctly-initialized codebase.

**This command is framework-agnostic on purpose.** It does NOT assume Next.js/NestJS/anything. The tech
stack file is the single source of truth for *what* to build; the *how* (which CLI, which flags, which
project layout) is something you research from each tool's own current docs at run time — never from
memory or from a hardcoded table. Your training data goes stale; `create-next-app`, framework CLIs, and
their recommended flags/layouts change between versions. Reading the live docs is the whole point of this
command.

Runs both steps automatically, asking nothing further once started (the only pause is if a tech choice is
genuinely ambiguous — see Step 1).

## Step 0 — Find the tech stack file

If the user provides a path when invoking the command → read that file.

If no path is given, search in priority order:
1. `.sdlc/versions.md`
2. `.sdlc/architecture.md`
3. `TECH_STACK.md`, `STACK.md`, `tech-stack.md` at the root
4. Glob `.sdlc/**/*.md` → read files containing the keywords "tech", "stack", "architecture", "framework"
5. Root `CLAUDE.md` if it has a tech stack section

Extract from whichever file you find:
- List of apps/services (name, type, framework, **exact version if pinned**, port)
- Main packages/libraries per app (with pinned versions where given)
- Monorepo tooling (pnpm workspaces, turborepo, nx…)
- Database, external services

If no file can be found → the tech stack hasn't been decided yet. Don't guess it. Tell the user and
suggest running **`/plan-stack`** first — it walks them through choosing the architecture + tech stack
(grounded in their business docs) and writes `.sdlc/architecture.md`, which this command then reads. Offer
to run it now; otherwise stop.

## Step 1 — Research, then init the codebase

### Check current state first

For each app in the tech stack:
- Has a `package.json` (or equivalent manifest) → skip
- Missing or empty directory → needs init

For the monorepo root:
- Do the workspace manifest (e.g. `pnpm-workspace.yaml`), the root `package.json`, and the task-runner
  config (`turbo.json` / `nx.json`) already exist?

### Research the correct scaffold — the core of this command

For EACH thing you need to create (the monorepo root tooling, each shared package, each app), before
running any command:

1. **Find the official, current source.** Use WebSearch + WebFetch against the technology's OWN docs
   (its official site / official CLI docs / official monorepo guide), not blog posts or Q&A sites.
   Prefer, in order: the framework's own "getting started / installation" page → the official CLI
   reference → the official monorepo/workspace guide.
2. **Match the version.** If the tech stack pins a version, read the docs FOR THAT VERSION (many docs
   sites have a version switcher). If it says `latest`/unpinned, read the current stable docs and note
   what version `@latest` currently resolves to.
3. **Extract the actual scaffold recipe:**
   - The exact create/init command the docs recommend today, and each flag's current meaning (flags get
     renamed, split, or removed between majors — confirm, don't assume).
   - The project layout the tool generates now (e.g. does it use a `src/` dir, an app-dir, a specific
     config filename) so your CLAUDE.md later matches reality.
   - How that tool is meant to live INSIDE a monorepo workspace (many CLIs have a dedicated monorepo
     path or flags to skip git/install).
   - Any recent breaking change or migration note that affects init for the pinned version.
4. **Decide from what you read** — the command you run must be justified by the docs you just fetched,
   not by what you remember. If the docs contradict your prior assumption, the docs win.

If two reasonable tools/approaches exist and the tech stack doesn't disambiguate (e.g. it just says
"React app" without saying Vite vs. Next vs. RSC), briefly ask the user which one — this is the one
allowed pause.

### Init in the correct order

**Order:** root workspace setup → shared packages → apps (an app may depend on a shared package, so
packages come first).

**Root (if missing):**
- Initialize the root manifest and the workspace/task-runner config the way the tech stack's chosen
  tooling documents it today (globs for `apps/*` and `packages/*`, or whatever that tool uses).

**Each app / package:**
- Run the create/init command you derived from the docs in the research step above.
- After the CLI finishes: delete any `.git` folder the CLI created inside a sub-app; install the extra
  main dependencies the tech stack lists (again, confirm current package names/install syntax from docs
  if a package's install story is non-obvious); wire up workspace references so an app can import a
  shared package (using the workspace-reference syntax the chosen tooling documents).

### Conserve main-conversation context (recommended)

Doc research fetches a lot of pages. If the tech stack has several apps, spawn a subagent per app to do
the *research-and-scaffold* leg and report back a short summary (what it read, what command it ran, the
resulting layout). Do the root workspace setup and the dependency-install/lockfile steps in one place
(not in parallel across subagents) so the lockfile doesn't race. If you keep it in the main conversation,
fetch docs targeted and don't dump whole pages into context — extract the recipe and move on.

### LIMITS — what NOT to do

Step 1 ONLY scaffolds empty projects the way the docs prescribe. Do NOT do any of the following:
- Create/edit pages, components, providers, layouts, hooks, services, controllers, or any business logic
- Write custom entrypoints, wire up providers, register resources/routes
- Run typecheck, build, or verify the build
- Boot the server/backend, curl endpoints, probe health checks
- Delete/replace the CLI's default files (keep the original scaffold intact)

Step 1's output = a project that runs its dev command showing the **framework's default page**
(Hello World). All customization belongs to the `/sdlc:run` execute phase.

### Step 1 report

Report what you researched alongside what you did, so the user can see the decisions were doc-driven:
```
✓ Init: apps/web    — Next.js 15 (per nextjs.org/docs, App Router + src dir)  · cmd: create-next-app ...
✓ Init: apps/api    — NestJS 11 (per docs.nestjs.com CLI monorepo guide)      · cmd: nest new ...
✓ Init: packages/ui — manual TS package (per pnpm workspaces docs)
→ Skip: packages/db (already exists)
```

## Step 2 — Write CLAUDE.md

### Read the actual structure before writing

Re-read after init completes — combine what the CLI actually produced with what the docs told you:
- Each app's actual folder structure
- The actual `package.json` (the CLI may add/remove packages vs. what you expected)
- Config files (`tsconfig.json`, framework config, `.env.example`)
- Path aliases that were set up

### Persona

Act as a **senior developer** with deep, CURRENT knowledge of this project's tech stack — informed by the
docs you just read in Step 1. Write rules based on the real, version-correct framework behavior you
confirmed — not generic advice, and not stale conventions from a previous major version. Rules must be
specific enough that an agent reading them immediately knows what to do and what not to do.

### Root CLAUDE.md

```markdown
# [Repo name]

## Workspace overview
| App/Package | Role | Main tech (with version) | Port |
|---|---|---|---|
[Fill from the actual, initialized apps]

## Shared packages
[List of packages/* with their purpose and how to import them]

## pnpm commands
[Take from the actual scripts in package.json — don't invent any]

## General principles
- Use the framework/library's built-ins; extend when needed; only write your own when nothing exists
- Shared logic → packages/, don't duplicate across apps
- Don't add new packages when the workspace already has something sufficient
- Centralize config in one place, don't hardcode it in scattered spots

## Conventions
[From the actual config: ESLint, Prettier, TypeScript, commit conventions if any]
```

### App CLAUDE.md

For each app, write `[app-path]/CLAUDE.md`:

```markdown
# [App name]

[One line describing what the app does]

## Commands
[From the actual scripts — including how to run from the root and from the app directory]

## Tech stack
[Main tech with the ACTUAL installed versions]

## Directory structure
[Actual folder structure the CLI produced, role of each directory]

## [Framework] — correct usage
[Framework-specific rules, version-correct per the docs you read — see the guidance below]

## Anti-patterns — don't do this
[What agents commonly get wrong with THIS version of the framework — specific, not generic]

## Shared packages in use
[Which packages/*, actual import paths]

## Env vars
[From .env.example if present]
```

### Framework rules — how to write them well

Every rule must answer: *"If I don't write this down, will the agent get it right on its own?"*
If the answer is "not sure" → write it. If it's "definitely right" → skip it.

Base these rules on the **version-correct** behavior you confirmed in Step 1's research — an idiom from an
older major can be actively wrong in the version that got installed. When the current docs establish a
recommended pattern (data fetching, routing, module wiring, state, migrations, etc.), encode THAT pattern
as the rule, and spell out the corresponding anti-patterns.

**Bad example** (too generic):
```
Use the framework's recommended data-fetching approach
```

**Good example** (specific, actionable, version-correct):
```
## Data fetching — required flow
src/api/[resource].ts      → plain API call functions (no hooks)
src/hooks/use[Resource].ts → wraps the fetching hook
Component                  → only calls the hook, never fetches directly

Anti-pattern:
- useEffect + fetch inside a component
- Calling the HTTP client directly in a component
- Creating a new client instance outside src/api/
```

Write the rules from the real conventions of the exact stack that got installed. If you're unsure whether
a convention still holds for this version, that's a signal to re-check the docs before writing the rule —
don't ship a rule you're guessing at.

### Merge if the file already exists

If CLAUDE.md already has content → merge: keep what's still valuable, add the missing sections, update
outdated ones. Don't overwrite the whole file.

## Final report

```
Step 1 — Codebase (doc-driven):
  ✓ Init: apps/web (Next.js 15 App Router — per official docs)
  ✓ Init: apps/api (NestJS 11 — per official docs)
  ✓ Init: packages/ui
  → Skip: packages/db (already exists)

Step 2 — CLAUDE.md:
  ✓ CLAUDE.md (root)
  ✓ apps/web/CLAUDE.md
  ✓ apps/api/CLAUDE.md
  ✓ packages/ui/CLAUDE.md

Needs manual completion:
  [List anything that couldn't be determined from docs or config]
```
