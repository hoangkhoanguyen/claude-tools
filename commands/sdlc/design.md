---
description: Run the design phase alone for one sprint — turn requirements + the UX map into architecture, data model, API contracts and a rule/edge-case mapping table, plus a UI spec and a Claude Design canvas the user can edit.
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

**UI branch** — spawn `ui-designer` in **mode `draft`** with skill `design-fidelity` + `artifact-design`.
- **Requirements have NO screens** (`has_ui: no`) → `design_ui: n/a`, skip this branch.
- **Requirements HAVE screens** → it covers every `SCR-xx` of `ux-map.md`, picking the aesthetic source per
  screen (external `.sdlc/<version>/<sprint>/ui-design.input.md` — markdown or links to Claude Design canvases —
  → ingest as `[external]`; otherwise generate from the Claude Design design system / `.sdlc/design-system.md`
  / DESIGN.md / the existing app's style; new project with no source → ask the user once). Only use
  `waiting-external` when the user explicitly said they will supply an external design and it hasn't arrived.
- Writes `ui-design.md`, updates `.sdlc/design-system.md`, and **draws the draft on a Claude Design canvas**
  (Artifact type "Design"). Its block carries `canvas: <url>` → write `ui_canvas_url` and
  `design_ui: awaiting-review`; or `canvas: unavailable (<reason>)` → `design_ui: done` (markdown spec only).

**Important — the 2 branches are independent:** the system branch does NOT wait for the UI design.
Only LATER phases (Tasks onward) need a final `ui-design.md`.

Status lines from `ui-designer`: `DONE`, `NEEDS_INPUT <question>` (relay to the user, respawn with the
answer), or `WAITING_EXTERNAL` (set `design_ui: waiting-external` in state and stop). Relay its Human Review
block verbatim, canvas link included.

**After the user approves the design** (they may first edit the canvas directly in Claude Design): if
`design_ui: awaiting-review`, spawn `ui-designer` in **mode `ingest`** — it reads the canvas back, snapshots it
to `.sdlc/<version>/<sprint>/design-source/`, makes `ui-design.md` match the approved visuals, and returns
`snapshot_hash` → write `design_ui: done`, `ui_snapshot_hash`. `NEEDS_INPUT` here lists canvas-vs-AC conflicts:
ask the user which is right (fix the canvas and re-ingest, or have `product-analyst` update the requirements).

Standalone, `architect` produces only `design.md`. When invoked by `/sdlc:run` on a sprint with NO UI
(`has_ui: no`), the prompt asks it to also write `tasks.md` in the same invocation; on a UI sprint the
`task-breakdown` agent writes `tasks.md` after the UI ingest. Design feedback: `architect` revises
`design.md` (and `tasks.md` on a no-UI sprint); UI feedback in text goes to `ui-designer` mode `draft`, which
revises `ui-design.md` and the SAME canvas.

Self-review: architect and ui-designer run `self-review` THEMSELVES before returning the file (you do
not run it for them). Then spawn `reviewer` to cross-check `design.md` (and the draft `ui-design.md` if
present) against `requirements.md` + `ux-map.md` — only `PASS` counts as done (`design` in `reviewer_passed`;
after an ingest, the final `ui-design.md` is reviewed against the snapshot → `ui`). When `tasks.md` exists, also pass it to `reviewer`
to check that every AC/EC has an owning task or `test-strategist` item. On `NEEDS_FIX`: `architect` /
`ui-designer` fix their own file; any edit to an artifact removes its entry (`design`, `tasks`) from
`reviewer_passed` before re-review, and `tasks.md` is regenerated afterwards (by `architect` on a no-UI sprint,
by `task-breakdown` on a UI sprint). After a DESIGN_GAP patch of `design.md` during execution, only the
UNFINISHED tasks of `tasks.md` are amended (done tasks keep ID/Batch/Tests).
Update `.sdlc/<version>/state.md` per the schema (including `reviewer_passed`).

This is a sub-phase of `/sdlc:run`; use it when you want to run or redo the design phase alone.
