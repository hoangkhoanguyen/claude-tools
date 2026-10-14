---
description: Run the analyze phase alone for one sprint — turn business logic docs into requirements (user stories, AC, business rules, data entities, edge cases).
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:analyze

Run the requirements analysis phase alone for sprint `$2` in version `$1`
(if empty, read from `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

**Do NOT read CLAUDE.md / business docs / architecture.md yourself** — the subagent loads them cold.
The main conversation only passes paths + version/sprint slugs.

Spawn subagent `product-analyst` with skill `requirements-analysis`. It globs the relevant CLAUDE.md
files itself, reads the business docs + `.sdlc/architecture.md` itself, runs `self-review` itself before
returning, and writes `.sdlc/<version>/<sprint>/requirements.md` in two layers: Human Review (top of file)
+ Agent Reference (including NFR and Regression Impact for an existing codebase). When the sprint has UI it
also writes `.sdlc/<version>/<sprint>/ux-map.md` (skill `ux-map`: screens `SCR-xx`, flows `FLOW-xx`,
permissions, on-screen data/copy/states) and adds the screens to `.sdlc/sitemap.md`. It returns a
pre-formatted Human Review block (including the `has_ui: yes|no` line) for the main conversation to relay
verbatim — do NOT re-read the file to summarize it. Relay `has_ui` too: it decides the planning path
(UI branch or not) and the test layers, so write `has_ui: yes|no` into `.sdlc/<version>/state.md` right away,
together with `analyze: done`, `ux_map: done|n/a` and `current_phase` — later phases read `has_ui` from state and never re-open
requirements.md for it.

Finish: spawn `reviewer` to cross-check against the source docs (pass it the business-doc path; it reads
them itself, no need for you to read first) — on a UI sprint it reviews `ux-map.md` in the same pass. Present
the requirements and the UX map (screens, flows) together: flows are cheapest to fix now, before anything is
drawn. On `NEEDS_FIX`, `product-analyst` fixes the issues; since
requirements.md changed, remove `analyze` from `reviewer_passed` in state.md before reviewing again, and add
`analyze` back on `PASS`. If there are Open Questions you cannot resolve
safely, ask the user. Update `.sdlc/<version>/state.md` per the schema (`analyze: done`, `has_ui`, `ux_map`, `current_phase`, `reviewer_passed`).

This is a sub-phase of `/sdlc:run`; use it when you want to run or redo the analyze phase alone.
