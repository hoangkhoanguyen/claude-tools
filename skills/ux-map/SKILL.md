---
name: ux-map
description: The structure and quality standard for a sprint's UX map (ux-map.md) and the project sitemap (.sdlc/sitemap.md) — screen inventory, navigation, user flows, role × screen permissions, on-screen data and copy, state matrix, AC → screen coverage. Written in the analyze phase when the sprint has UI, BEFORE any visual design, so flow mistakes are caught while they are still cheap to fix.
---

# UX Map

The skill of settling WHAT the interface must contain and HOW the user moves through it — before anyone draws
it. A wrong flow found on a polished mockup costs a redraw; found on a list, it costs one line. The UX map is
also the single source of truth for screens: `architect` designs the API around it, `ui-designer` draws exactly
these screens, `test-strategist` turns the flows into e2e scenarios.

## When to write it

Only when the sprint has UI (`has_ui: yes`). Written by `product-analyst` in the same invocation as
`requirements.md` (it already holds the stories and has read the codebase for Regression Impact).

**Scale to the sprint.** A sprint that adds 1–2 screens to an existing area gets a compact map: the screen
table + the state/copy rows that matter + the coverage table, no separate flow diagram unless the flow
branches. Never pad.

## Files

- `.sdlc/<version>/<sprint>/ux-map.md` — this sprint's map (two layers, below).
- `.sdlc/sitemap.md` — the PROJECT's navigation tree, cross-version (like `architecture.md`). Each sprint adds
  its screens to the tree; never delete earlier entries. Existing project, first time: describe the CURRENT
  navigation from the codebase (routes, menus), then add this sprint's screens.
  In a pipelined sprint (planning runs while another sprint executes) write `sitemap.proposal.md` in the sprint
  folder instead; the caller merges it at the previous sprint's handoff.

## ux-map.md structure

### PART 1 — Human Review (top of file)

1. **Screen inventory** — one row per screen/dialog, IDs `SCR-01`…:

   | ID | Screen | Who uses it | Purpose | Where (sitemap path / route) | New / changed |
   |---|---|---|---|---|---|

2. **Main flows** — one Mermaid `flowchart` per main use case (`FLOW-01`…): entry point → screens → exit,
   including the branches that matter (validation error, cancel, no permission, session expired, empty
   result). Node labels use the `SCR-xx` names.
3. **UX open questions** — anything the stories leave ambiguous about navigation or interaction. Resolve
   safely → record the assumption; otherwise ask (these join the requirements' Open Questions).

### PART 2 — Agent Reference

4. **Role × screen permissions** — per role: which screens are visible, which actions are allowed. Ties to
   the authz RULE/NFR ids. (Skip for a single-role app.)
5. **Per screen** (`SCR-xx`):
   - **Data shown** — field, source entity/field, format (money, date, number, enum label), a realistic example
     value. This is what `architect` sizes the API against, so be complete.
   - **Actions** — control → result (navigation to `SCR-yy`, API effect, dialog), with the AC id it serves.
   - **States** — default / loading / empty / error / no permission / validation (only those that apply), with
     what the user sees in each.
   - **Copy** — labels, button text, validation messages, empty-state text, confirmation dialogs, in the app's
     language. Taken from the business docs where they exist; otherwise proposed and marked `[proposed]`.
6. **AC → screen coverage** — every AC with a UI facet maps to ≥ 1 `SCR-xx`; every `SCR-xx` serves ≥ 1 AC.

## Quality rules

- **Don't invent features.** Screens and actions come from the stories; navigation glue (a back link, a
  confirmation dialog for a destructive action) is fine and should be marked as such.
- **No visual decisions** (colors, spacing, layout details) — that is `ui-designer`'s job. The map says what is
  on the screen and how it behaves, not how it looks.
- **Every screen reachable, every flow terminates.** No orphan screens, no dead ends.
- **Follow the existing app** in an existing project: reuse its navigation structure and naming.

## Self-review checklist

- [ ] Every AC with a UI facet has a screen; every screen serves an AC?
- [ ] Every screen has an entry point in the sitemap; every flow reaches an exit (incl. error/cancel branches)?
- [ ] Every data field has a source entity and a format?
- [ ] Destructive actions have a confirmation; failures have a message?
- [ ] Permissions stated per role (multi-role apps)?
- [ ] Sitemap updated (or `sitemap.proposal.md` when pipelined)?
