---
name: self-review
description: A checklist for reviewing your own output after each SDLC phase — without the user asking. Covers internal review (is the output good enough) and cross-checking against the previous phase (is coverage complete, are there contradictions). Use at the end of each phase before writing files or declaring done.
---

# Self-Review

The skill of looking back at what you just did BEFORE considering it finished — applied at the end of every
phase, without waiting for the user to ask. The philosophy: "finished" ≠ "good enough". Always check and fix
your own work before handing off to the next step.

## Two review layers

**Layer 1 — Internal review (is this phase's own output good enough?)**
- Does the output have enough information for the NEXT phase to work without guessing?
- Is anything vague, missing, or self-contradictory?
- Is there invented/superfluous content beyond the input? → cut it.

**Layer 2 — Cross-check against the previous phase (is it consistent & complete?)**
- Is every artifact from the previous phase reflected? (rule → design, AC → task, AC/EC → test)
- Does anything contradict decisions/constraints settled in the previous phase?
- Was anything from the previous phase forgotten?

## Checklist per phase

**After analyze:** can the architect design from this? does every story have testable AC? does every rule
have ECs? are the NFRs recorded? is Regression Impact listed (for an existing codebase)? was anything invented?

**After design:** is every RULE-xx / EC-xx / NFR-xx in the mapping table? do existing modules have a
Regression-safe Plan? does it fit the codebase + architecture.md + CLAUDE.md? are there extra
endpoints/entities?
If there's UI: does every screen/state have a spec + Design AC (full coverage, whether the source is external
or generated)? do visual values go through tokens rather than being hardcoded? does it follow the aesthetic
source (external design / DESIGN.md / the existing app's style) without invention? are the `[generated]`
screens visually consistent with the `[external]` ones?

**After tasks:** does every AC/EC have ≥1 owning task? are the dependencies & parallelism right? does each
task have test criteria?

**After each task (execute):** are the relevant ECs handled? any leftover TODOs/hardcoded values/debug
output? did the tests actually run and pass? was anything in the related area broken?

**After test:** does every AC/EC/NFR (+ DAC if there's UI) have a test or appear on the manual-verify list?
did the tests actually run green? did visual verification run? is the "manual verification" portion genuinely
un-automatable?

**End of sprint (qa-guard):** did you actually run the full test suite + happy paths + the regression happy
paths of existing features? are the NFRs genuinely met? is design fidelity met (if there's UI)? does the
report clearly separate "covered" from "needs manual verification"?

## The independent reviewer (complementing self-review)

Self-review is self-grading, so it has blind spots. After analyze and design, beyond self-review, also spawn
the `reviewer` agent (read-only) to cross-check the output against its input. Only move to the next phase
once the reviewer returns `PASS`.

## The rule

If ANY item FAILS → FIX it immediately and review again. Do NOT write the file / declare done with a known
defect. Only move to the next phase once every item passes.
