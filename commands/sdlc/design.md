---
description: Run the design phase alone for one sprint — turn requirements into architecture, data model, API contracts, UI flow and a rule/edge-case mapping table.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:design

Run the design phase alone for sprint `$2` in version `$1`
(if empty, read from `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

Requires `.sdlc/<version>/<sprint>/requirements.md` to exist (run `/sdlc:analyze` first if not).

**Do NOT Glob/Read CLAUDE.md or `.sdlc/architecture.md` yourself** — architect and ui-designer are
cold-start subagents, each loads the parts relevant to itself. The main conversation only passes the
version/sprint slug + the `requirements.md` path.

Run 2 branches (in parallel, INDEPENDENT):

**System branch** — spawn `architect` with skill `system-design`. Reads the codebase +
`.sdlc/architecture.md` + relevant CLAUDE.md files. Writes `.sdlc/<version>/<sprint>/design.md` in two
layers + a mapping table covering 100% of RULE/EC/NFR + a Regression-safe Plan. Updates
`.sdlc/architecture.md` if foundational components change.

**UI branch** — spawn `ui-designer` with skill `design-fidelity` + `artifact-design`.
The ui-designer examines the UI scope in `requirements.md`, then picks a design source per screen:
- **Requirements have NO screens** → `design_ui: n/a`, skip this branch.
- **Requirements HAVE screens** → `ui-design.md` must cover every screen/state. Per screen:
  - Screen IS in the external design `.sdlc/<version>/<sprint>/ui-design.input.md` → ingest + normalize.
  - Screen is NOT provided → generate it, source priority: `.sdlc/design-system.md` → DESIGN.md →
    existing project: follow the current app's style → new project with no source: ask the user once.
  - Only use `waiting-external` when the user explicitly said they will supply an external design
    and the file hasn't arrived yet.

Writes `.sdlc/<version>/<sprint>/ui-design.md`; updates `.sdlc/design-system.md`.

**Important — the 2 branches are independent:** the system branch does NOT wait for the UI design.
Only LATER phases (Tasks onward) need a complete `ui-design.md`.

Self-review: architect and ui-designer run `self-review` THEMSELVES before returning the file (you do
not run it for them). Then spawn `reviewer` to cross-check `design.md` (and `ui-design.md` if present)
against `requirements.md` — only `PASS` counts as done.
Update `.sdlc/<version>/state.md` per the schema.

This is a sub-phase of `/sdlc:run`; use it when you want to run or redo the design phase alone.
