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
+ Agent Reference (including NFR and Regression Impact for an existing codebase). It returns a
pre-formatted Human Review block for the main conversation to relay verbatim — do NOT re-read the file
to summarize it.

Finish: spawn `reviewer` to cross-check against the source docs (it reads them itself, no need for you
to read first) — on `NEEDS_FIX`, fix then review again. If there are Open Questions you cannot resolve
safely, ask the user. Update `.sdlc/<version>/state.md` per the schema.

This is a sub-phase of `/sdlc:run`; use it when you want to run or redo the analyze phase alone.
