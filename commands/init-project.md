---
description: Take a prepared tech stack file → init the missing apps in the monorepo → write CLAUDE.md for the root and each app.
argument-hint: [path to tech stack file]
---

# /init-project

Take a prepared tech stack file → init the missing apps in the monorepo → write CLAUDE.md for the root and each app.
Runs both steps automatically, asking nothing further once started.

## Step 0 — Find the tech stack file

If the user provides a path when invoking the command → read that file.

If no path is given, search in priority order:
1. `.sdlc/versions.md`
2. `.sdlc/architecture.md`
3. `TECH_STACK.md`, `STACK.md`, `tech-stack.md` at the root
4. Glob `.sdlc/**/*.md` → read files containing the keywords "tech", "stack", "architecture", "framework"
5. Root `CLAUDE.md` if it has a tech stack section

Extract from whichever file you find:
- List of apps/services (name, type, framework, port)
- Main packages/libraries per app
- Monorepo tooling (pnpm workspaces, turborepo…)
- Database, external services

If no file can be found → tell the user and stop.

## Step 1 — Init the codebase

### Check current state

For each app in the tech stack:
- Has a `package.json` → skip
- Missing or empty directory → needs init

For the monorepo root:
- Do `pnpm-workspace.yaml`, the root `package.json`, and `turbo.json` already exist?

### Init in the correct order

**Order:** root setup → shared packages → apps

**Root (if missing):**
- Create the root `package.json` with `pnpm init`
- Create `pnpm-workspace.yaml` with the globs `apps/*` and `packages/*`
- Create `turbo.json` if the tech stack specifies Turborepo

**Init each app — use the right CLI:**

| Framework | Command |
|---|---|
| Next.js | `pnpm create next-app@latest apps/[name] --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git` |
| NestJS | `pnpm dlx @nestjs/cli new apps/[name] --package-manager pnpm --skip-git` |
| Vite + React | `pnpm create vite apps/[name] --template react-ts` |
| Remix | `pnpm create remix apps/[name] --no-git-init` |
| Express/Fastify | Create manually: `mkdir -p apps/[name]/src`, `pnpm init`, install deps |
| Shared package | `mkdir -p packages/[name]/src`, `pnpm init`, install the appropriate deps |
| Prisma package | `pnpm init` + `pnpm add prisma @prisma/client` + `pnpm dlx prisma init` |

After init:
- Delete the `.git` folder if the CLI created one inside a sub-app
- Install the additional main dependencies specified in the tech stack
- Add workspace references (`"@repo/[name]": "workspace:*"`) to any app using a shared package

### LIMITS — what NOT to do

Step 1 ONLY scaffolds empty projects via CLI. Do NOT do any of the following:
- Create/edit pages, components, providers, layouts, hooks, services, controllers, or any business logic file
- Write custom App.tsx/App.vue, wire up providers, register resources/routes
- Run typecheck, build, or verify the build
- Boot the server/backend, curl endpoints, probe health checks
- Delete/replace the CLI's default files (keep the original scaffold intact)

Step 1's output = a project that runs `pnpm dev` showing the **framework's default page** (Hello World).
All customization belongs to the `/sdlc:run` execute phase.

### Step 1 report
```
✓ Init: apps/web (Next.js 14)
✓ Init: apps/api (NestJS 10)
✓ Init: packages/ui
→ Skip: packages/db (already exists)
```

## Step 2 — Write CLAUDE.md

### Read the actual structure before writing

Re-read after init completes:
- Each app's actual folder structure
- The actual `package.json` (the CLI may add/remove packages)
- Config files (`tsconfig.json`, framework config, `.env.example`)
- Path aliases that were set up

### Persona

Act as a **senior developer** with deep knowledge of this project's entire tech stack.
Write rules based on real framework knowledge — not generic advice; specific enough that an agent reading
them immediately knows what to do and what not to do.

### Root CLAUDE.md

```markdown
# [Repo name]

## Workspace overview
| App/Package | Role | Main tech | Port |
|---|---|---|---|
[Fill from the actual tech stack]

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
[List of main tech with actual versions]

## Directory structure
[Actual folder structure, role of each directory]

## [Framework] — correct usage
[Framework-specific rules — see the guidance below]

## Anti-patterns — don't do this
[What agents commonly get wrong with this framework — must be specific, not generic]

## Shared packages in use
[Which packages/*, actual import paths]

## Env vars
[From .env.example if present]
```

### Framework rules — how to write them well

Every rule must answer: *"If I don't write this down, will the agent get it right on its own?"*
If the answer is "not sure" → write it. If it's "definitely right" → skip it.

**Bad example** (too generic):
```
Use React Query to fetch data
```

**Good example** (specific, actionable):
```
## Data fetching — required flow
src/api/[resource].ts      → plain API call functions (axios, no hooks)
src/hooks/use[Resource].ts → wraps useQuery/useMutation
Component                  → only calls the hook, never fetches directly

Anti-pattern:
- useEffect + fetch inside a component
- Calling axios directly in a component
- Creating a new axios instance outside src/api/
```

**Rules for common frameworks:**

*React + TanStack Query:*
- Flow: api function → useQuery hook → component (no shortcuts)
- Mutations: useMutation + invalidateQueries, don't refetch manually
- Server data vs UI state: React Query for server data, useState/Zustand for UI state

*Next.js App Router:*
- Server Components fetch directly (async/await), not useEffect
- `use client` only when needed: event handlers, browser APIs, stateful UI
- next/image instead of img, next/link instead of a, next/font instead of CDN fonts
- Client-side env vars must have the NEXT_PUBLIC_ prefix

*NestJS:*
- Create modules/services/controllers via the CLI (`nest g module`, `nest g service`…), not by hand
- Validate with class-validator + ValidationPipe, don't validate manually in the controller
- Inject via the constructor, don't `new` a service manually
- Auth → Guard, don't check tokens inside a service/controller

*Prisma:*
- Singleton PrismaClient, don't `new PrismaClient()` in every file
- Use prisma migrate dev when changing the schema, don't edit committed migration files
- Prisma.$transaction() for operations that need to be atomic

*tRPC:*
- Define routers centrally, export a single appRouter
- Don't call procedures directly from another server — use the server-side caller
- Input validation via Zod schemas in the procedure definition

*Zustand:*
- One store per domain, not one giant global store
- Actions live in the store, don't define them outside
- Don't store server data in Zustand — use React Query

### Merge if the file already exists

If CLAUDE.md already has content → merge: keep what's still valuable, add the missing sections, update
outdated ones. Don't overwrite the whole file.

## Final report

```
Step 1 — Codebase:
  ✓ Init: apps/web (Next.js 14 App Router)
  ✓ Init: apps/api (NestJS 10)
  ✓ Init: packages/ui
  → Skip: packages/db (already exists)

Step 2 — CLAUDE.md:
  ✓ CLAUDE.md (root)
  ✓ apps/web/CLAUDE.md
  ✓ apps/api/CLAUDE.md
  ✓ packages/ui/CLAUDE.md

Needs manual completion:
  [List anything that couldn't be detected from config]
```
