---
description: Read the business logic docs and split them into sprints for a new version. Run it first with v1; reuse it when starting a new development cycle (v2, v3, …).
argument-hint: <version-slug> [path to business logic docs]
---

# /sdlc:sprint-plan

Break business logic docs into sprints for **one specific version**.

## Input

- `$1`: version slug — e.g. `v1`, `v2`, `phase-2`. If empty, determine it:
  - No `.sdlc/versions.md` yet → this is the first run, use `v1`.
  - Already exists → read the next version (last v + 1) and confirm with the user.
- `$2`: business logic docs (file / URL / paste). If empty, ask the user.

The plugin does NOT generate business logic docs — this is user-supplied input.

## Model — remind the user once, here

This is the plugin's first entry point, so remind the user **exactly once** and then drop it: the session
running `/sdlc:*` should use **Opus** (`/model opus`), because it holds every decision and approval gate
across the whole sprint — **and because the phase 1-3 agents (`product-analyst`, `architect`,
`ui-designer`, `reviewer`) declare `model: inherit`, meaning they run on this session's model.** Leave the
session on Sonnet and all three early phases run on Sonnet too.

Phases 4-6 are unaffected: they hard-pin `sonnet` to lower the model regardless of what the main session
runs. So **no extra configuration is needed** beyond choosing the session model.

After the reminder, carry on normally — don't stop and wait for the user to change models, and don't
repeat the reminder in later commands.

## Steps

1. **Delegate reading the docs to a subagent (do NOT Read them yourself).** User business docs are
   usually long (BRD/PRD/SRS, 20-50 pages) and a team's CLAUDE.md files can number 5-10 — if the main
   conversation reads them itself, that context has to survive the entire version. Spawn subagent
   `product-analyst` with the special "sprint decomposition" task: pass the business doc paths + version
   slug. It globs CLAUDE.md itself, reads `.sdlc/architecture.md` (if present) itself, reads the business
   docs itself, and returns a **proposed sprint table** (slug, 1-2 line goal, features, dependencies,
   tech stack suggestion) + a ready Human Review block to relay. The main conversation only receives the
   condensed table — it never holds the raw docs.

2. **Receive the sprint table from the subagent.** Each sprint is a self-contained feature block that can
   be delivered independently. If the returned table has dependency/ordering problems, send feedback for
   it to revise — don't fix it yourself by re-reading the docs.

3. **Write `.sdlc/<version>/sprints.md`** with, for each sprint:
   - A short slug, **required to follow the pattern `sprint-<number>-<name>`** (e.g. `sprint-1-auth`,
     `sprint-2-orders`). Numbering restarts at 1 in each version — the version namespace keeps them
     separate, so collisions aren't a concern.
   - Name & 1-2 line description (what it delivers)
   - The main features in the sprint
   - Which sprints it depends on (in this version or a previous one)
   - Suggested tech stack (for the user to confirm) — inherit the existing stack if the project has one
   - Status: `planned`

4. **Initialize `.sdlc/<version>/state.md`** per the `templates/state.template.md` schema:
   set `version: <version-slug>`, no sprint started yet.

5. **Update `.sdlc/versions.md`** (create it if missing): add a row for the new version with status
   `planned`. This file is the registry of all versions, letting `/sdlc:status` and `/sdlc:run` identify
   the active version.

6. **Set up gitignore** (first time only — when `.sdlc/` doesn't exist yet or the line is missing):
   add to the project's `.gitignore`:
   ```
   .sdlc/*/*/visual-baseline/
   ```
   Everything else in `.sdlc/` is committed — it's the project's living documentation, tracked by the
   whole team through git.

7. **Initialize/update `.sdlc/architecture.md`** (cross-version, at the `.sdlc/` root):
   - First time (v1): record foundational decisions — overall stack, directory structure, auth mechanism,
     core data model, shared conventions. For an existing project: describe the CURRENT architecture.
   - Later versions: only add new foundational changes, never delete previous versions' history.
   This file is the reference source for `architect` in every sprint of every version.

8. **Detect the visual design direction.** Determine whether the project is existing or new, and what
   aesthetic source is available:
   - **Has DESIGN.md / design system** → initialize/update `.sdlc/design-system.md` (cross-version),
     extracting design tokens. This is the reference source for ui-designer.
   - **Existing project, no DESIGN.md** → note it: UI follows the current app's style. Do NOT ask about style.
   - **New project, no aesthetic source** → the first sprint with screens will ask the user once, then
     generate `DESIGN.md`.

9. **Present the sprint list to the user** at a high level. Invite them to: reorder, merge/split, confirm
   the tech stack.

## Self-review before presenting (use the self-review skill)

- Is every feature in the docs covered by at least one sprint? (nothing missed)
- Does the sprint order respect dependencies?
- Is each sprint small enough for light review, but large enough to deliver something meaningful?

## After the user confirms

Update `.sdlc/<version>/sprints.md` with the user's edits.
Tell them: run `/sdlc:run <version> <sprint-slug>` to begin.
