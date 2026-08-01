---
description: Update the sprint list in a version when the business logic docs change, WITHOUT losing the state of sprints already done or in progress. Use when new features appear, priorities shift, or sprints need merging/splitting mid-project.
argument-hint: <version-slug> [path to new/updated business logic docs]
---

# /sdlc:replan

Adjust the sprint plan within a version when business logic changes mid-flight, preserving completed work.

> Use this command when the change falls **within the current version** (adding/editing/dropping small
> features, reordering sprints). For an entirely new development cycle → use `/sdlc:sprint-plan <new-version>`.

## Input

- `$1`: version slug to replan (e.g. `v1`). If empty, take the active version from `.sdlc/versions.md`.
- `$2`: new/updated business logic docs. If empty, use the original docs + ask the user what changed.

## Steps

1. **Read current state**: `.sdlc/versions.md` + `.sdlc/<version>/sprints.md` +
   `.sdlc/<version>/state.md` + any existing `.sdlc/<version>/<sprint>/` directories.
   Read the relevant CLAUDE.md files (principle 0).

2. **Business diff**: compare the new docs against existing sprints in this version. Classify changes:
   - NEW feature with no sprint → create a new sprint (status `planned`). **The slug must continue the
     numbering from the last sprint in `.sdlc/<version>/sprints.md`** (including `cancelled` sprints);
     do NOT renumber from 1. Example: with `sprint-1-auth` through `sprint-3-reports` existing, the new
     sprint starts at `sprint-4-...`. This keeps slugs unique within the version and prevents folder
     overwrites.
   - CHANGED feature in a sprint NOT yet started (`planned`) → update that sprint's description.
   - CHANGED feature in a sprint already done/in progress → do NOT overwrite. Create a new "change
     request" sprint referencing the original, handling it as a controlled change (preserves history +
     avoids corrupting existing state).
   - DROPPED feature → mark the sprint/feature `cancelled`, do not delete (keep the trail).

3. **Update `.sdlc/<version>/sprints.md`** per the classification above, preserving the status of sprints
   already done/in progress. Update dependencies if the order changed.

4. **Do NOT touch** `.sdlc/<version>/<sprint>/` for sprints already done/in progress, unless the user
   explicitly asks.

5. **Self-review** (skill self-review): does every feature in the new docs have an owning sprint?
   Does the order respect dependencies? Is any in-progress sprint's state corrupted?

## Presenting

Summarize: which sprints were added/changed/cancelled in version `<version>`, which stayed the same.
Invite the user to confirm. Remind them: `/sdlc:run <version> <slug>` for new sprints; in-progress
sprints still resume normally.
