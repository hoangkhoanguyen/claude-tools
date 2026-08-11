---
description: Interactively help the user decide the overall architecture + concrete tech stack, grounded in the business docs, and write it to .sdlc/architecture.md — the file /init-project and the SDLC design phase both consume.
argument-hint: [path to business docs / BRD]
---

# /plan-stack

Turn "I have a BRD but no decided stack" into a **concrete, version-pinned architecture + tech stack** in
`.sdlc/architecture.md`, so `/init-project` can scaffold it and the `/sdlc:*` phases build on it.

**The plugin's ONE interactive command** (opposite of the silent `/init-project`): you *propose → ask →
confirm* in a few tight rounds, so the user mostly nudges well-reasoned defaults instead of inventing from
blank. **Framework-agnostic** — don't push a favorite stack; derive every choice from what the business
docs need + the user's constraints, then justify it.

## Context discipline (same rule as the rest of the plugin)

The main conversation drives the Q&A and holds the decisions — it does NOT read the BRD or dump doc pages
into its own context. Delegate the heavy reading:
- **Reading the business docs** → spawn `product-analyst` (returns a condensed summary, not the raw docs).
- **Live version/compatibility research** → spawn a subagent per cluster of tools (returns the recipe).
Keep only the condensed summaries + the running set of decisions in the main context.

---

## Step 0 — Gather input & detect current state

**Business docs** (`$1`): a file / path / URL / paste of the BRD/PRD. If not given, search in order:
`.sdlc/**/*.md` (BRD/requirements-like), `BRD.md`/`PRD.md`/`REQUIREMENTS.md` at root. If still nothing →
ask the user to point at the business docs (this command is only useful grounded in them).

**Delegate all the reading to `product-analyst`** in one "stack-scoping" task — the main conversation only
runs cheap existence Globs (paths, not content) to decide whether to even spawn it. Have it read the
business docs **and** any existing `.sdlc/architecture.md` + codebase manifests, and return one
**condensed brief**:
- Domain + the handful of core entities; main feature areas
- NFRs that actually move the stack decision: expected scale, realtime/streaming, offline, heavy
  background jobs, strong consistency vs. eventual, compliance (PII/PCI/HIPAA), multi-tenant
- Integrations the docs already imply (payment, email/SMS, maps, existing internal systems)
- **Existing-state verdict** — one of: *fresh* (no arch, no code); *revision* (an `.sdlc/architecture.md`
  exists → summarize its settled decisions so we only fill gaps, don't re-litigate); *inherit* (codebase
  manifests like `package.json`/`go.mod`/`pom.xml` exist → the stack is largely decided, so plan-stack
  only fills missing pieces consistent with it — never propose replacing a working stack).

Route the rest of the flow on that verdict: *fresh* → full flow; *revision*/*inherit* → skip settled
layers, only ask about the gaps.

---

## Step 1 — Overall architecture (propose, don't interrogate)

From the brief, propose **2-3 architecture shapes** with trade-offs mapped to THIS project's scale/NFRs —
not generic pros/cons. Example axes to choose along: single deployable vs. modular monolith vs. a few
services; monorepo vs. polyrepo; server-rendered vs. SPA+API vs. RSC; sync request/response vs.
event/queue for the heavy parts.

Present it as a recommended default + alternatives, with a one-line "pick this if…" for each, and let the
user choose or adjust. Never ask an open "what architecture do you want?" — most users can't answer that
cold; give them something to react to.

---

## Step 2 — Constraints (these drive the stack more than taste)

Confirm the few constraints that actually change the answer. Prefer a compact multi-select/confirm over a
long interview:
- **Team's existing strengths** — language/frameworks the team already knows (don't pick a stack nobody
  can maintain).
- **Deployment target** — a specific cloud / on-prem / serverless / "not decided yet".
- **Managed vs. self-hosted** appetite (managed DB/auth/queue vs. run-your-own).
- **Hard NFRs to honor** — pull the candidates from the brief (scale, realtime, offline, compliance) and
  have the user confirm which are real for v1 vs. later.
- **Must-integrate systems** — anything existing the new system has to talk to.

Anything the user says "don't care / you decide" → you decide, and record the rationale.

---

## Step 3 — Decide the stack, layer by layer (default + alternatives)

Walk the layers relevant to the chosen architecture. For **each** layer, give a sensible **default**
justified by Steps 1-2, plus 1-2 alternatives, and let the user confirm/switch:
- Frontend (framework + rendering approach) — if there's a UI
- Backend (language + framework)
- Database(s) + why (relational vs. document vs. both; the entities from the brief inform this)
- Auth / identity
- Async/eventing, caching, search — only if the NFRs call for them (don't over-build)
- Hosting / infra
- Monorepo tooling + package manager (if monorepo)
- Testing stack

Keep it to the layers this project needs. Don't invent a Kafka + Redis + Elasticsearch trio for a CRUD app.

---

## Step 4 — Pin versions & check compatibility (live docs, not memory)

**Verify, don't recall** (same doc-driven rule as `/init-project`). Delegate to subagent(s) to check the
agreed tools against their OWN current docs:
- The current stable version each choice resolves to → the exact version to pin.
- **Cross-compatibility** — do the pinned versions work together (framework ↔ major libs ↔ runtime ↔ DB
  driver/ORM)? Flag conflicts + any breaking-change/migration caveat a future build would hit.

Resolve any incompatibility with the user **before** writing the file — otherwise it only surfaces when
`/init-project` scaffolds and the build breaks.

---

## Step 5 — Hand the decisions to `architect` to write the file

**Don't write `.sdlc/architecture.md` from the main conversation** — that would pull the whole document
into main context, and the plugin's rule is that `architect` owns writing this file. Instead, pass
`architect` the **finalized decision set** (the compact result of Steps 1-4: architecture shape, per-layer
choices, pinned versions, compatibility flags, integrations) and have it:
- Create `.sdlc/` at the **repo root** if missing (never nested in a sub-app), write/**merge**
  `.sdlc/architecture.md` (keep settled decisions, update only what changed) in the structure below,
- Apply the `.gitignore` convention on first `.sdlc/` creation (`.sdlc/*/*/visual-baseline/`) and commit,
- Return a **short Human Review summary** (not the file body) for you to relay in Step 6.

The file it writes is the single source of truth BOTH `/init-project` (to scaffold) and the SDLC design
phase (`architect` / `system-design` reads it) consume — structure:

```markdown
# Architecture — [Project name]

## Overview
[2-4 sentences: the architecture shape chosen in Step 1 and the one-line why.]

## Architecture decisions
[Each significant decision → the choice + the reason, tied back to a business need / NFR / constraint.
 Keep it skimmable; this is the "why" future agents shouldn't have to re-derive.]

## Apps / services
| App/Service | Type | Framework (pinned version) | Port |
|---|---|---|---|
[One row per deployable. Versions pinned per Step 4. This table is what /init-project reads to scaffold.]

## Shared packages
[packages/* — purpose + who imports them. Empty section is fine if none.]

## Monorepo tooling
[Workspace manager + task runner + package manager, with versions. Omit if single-app / polyrepo.]

## Main libraries per app
[Per app: the key libs the user chose (state, data-fetching, ORM, validation, UI kit…), pinned.
 Only the load-bearing ones — not the whole dependency tree.]

## Data stores
[Each DB/cache/search engine: which one, version, what it holds, managed vs. self-hosted.]

## External services / integrations
[Payment, email/SMS, auth provider, maps, internal systems… — with the role each plays.]

## Compatibility notes
[Anything Step 4 flagged: version pins that must move together, known caveats for the scaffold/build.]

## Open decisions
[Anything deliberately deferred to a later version, so it's not mistaken for an oversight.]
```

---

## Step 6 — Hand off

Relay the `architect`'s Human Review summary, then point at the next step:

```
✓ Wrote .sdlc/architecture.md
  Architecture: [shape, one line]
  Apps: apps/web (Next.js 15), apps/api (NestJS 11), …   ← version-pinned
  Data: PostgreSQL 16 (managed), Redis 7
  Flagged: [any compatibility caveat, or "none"]

Next:
  → /init-project   scaffold these apps from the docs (empty Hello-World projects + CLAUDE.md)
  → /sdlc:sprint-plan   split the BRD into sprints and start building
```

Don't scaffold anything here — plan-stack only **decides and records**. Creating the projects is
`/init-project`'s job; writing features is `/sdlc:run`'s.
