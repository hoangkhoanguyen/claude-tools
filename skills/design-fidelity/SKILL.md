---
name: design-fidelity
description: A checklist and method for comparing the implemented UI against the design direction (the approved Claude Design canvas snapshot / DESIGN.md / design-system.md) — design tokens, contrast/accessibility, responsive, dark/light, spacing/typography. Use in the execute phase (when building UI) and in test/qa (visual verification) for projects with a visual design element.
---

# Design Fidelity

The skill of ensuring the built UI MATCHES the design, so the user's manual test doesn't hit "pixel drift /
wrong colors / broken layout" — leaving only the experience itself to assess.

## When to use it

Only when the project has an aesthetic direction: an approved canvas snapshot
(`.sdlc/<version>/<sprint>/design-source/`), a `DESIGN.md`, a `.sdlc/design-system.md`, or a clear design system
in the codebase. Otherwise → skip it, and let the UI follow the codebase conventions.

## Principles for building to the design (execute)

- Every visual value goes through a **design token**; do NOT hardcode colors/spacing/fonts/radii.
- When `ui-design.md` has a "Design source" header (an approved Claude Design canvas), the snapshot in
  `design-source/` is the visual reference: open the artboard for the `SCR-xx` you are building and match its
  layout, hierarchy and spacing — `ui-design.md` tells you which tokens produce it.
- Reuse existing components before creating new ones.
- Implement EVERY specified state: default/hover/active/disabled/loading/empty/error.
- Responsive per the breakpoints in the tokens; check both dark & light if the project supports them.

## Comparison checklist (test / qa) — per screen

- [ ] **Correct tokens**: colors/typography/spacing/radii/shadows match `design-system.md` (no stray values).
- [ ] **Contrast / a11y**: text/background contrast meets the threshold (≥ 4.5:1 for body text); focus states
      exist; images have alt text; controls have labels/roles.
- [ ] **Responsive**: layout doesn't break at the smallest or largest defined breakpoint.
- [ ] **Dark/Light**: both modes use the correct tokens, with no washed-out text or lost contrast.
- [ ] **Complete states**: empty/loading/error render correctly, no blank screens or freezes.
- [ ] **Design AC**: every `DAC-xx` in ui-design.md is met.

## Visual verification with Playwright

Check by code, look at pictures only when something is red — each image read into context is re-billed every turn.

- **One matrix spec** loops over screen/state × breakpoint (smallest and largest defined) × theme (if both
  exist). Per cell it asserts the DAC-xx by code: token colors/sizes via computed style, no horizontal overflow
  or overlapping boxes, contrast ≥ threshold, every specified state renders.
- **Baseline by tool, not by eye.** Use `expect(page).toHaveScreenshot()` (with a small `maxDiffPixelRatio`)
  against `.sdlc/<version>/<sprint>/visual-baseline/`; read only the diff images of cells that fail. With no
  baseline yet → write to `visual-baseline/.pending/`, promote after the DAC-xx pass.
- **Remove noise first**: animations off (`animations: 'disabled'`), time frozen, dynamic text/ids masked
  (`mask:`), fonts loaded before the shot.
- **Eyes-on budget**: at most one image looked at per screen (smallest breakpoint), plus any cell whose check
  failed. Never view every cell.
- **Matrix output stays quiet**: the run prints failing cells and one summary line, not a line per check (see
  test-strategist → "Quiet output").

## Eyes-on through a subagent

An image read into context is re-billed on every later turn of that session, and an app-vs-design comparison
reads two per screen. So whoever is running the test leg (`test-strategist`, `qa-guard`) never Reads a
screenshot itself. It spawns one throwaway subagent (`Agent`, default type, `model: "sonnet"`) per batch of up to
~10 images, passing:

- the image paths (app shot, and the matching design render / baseline / diff image when comparing),
- what to judge per image: the DAC-xx ids and the `SCR-xx` description from `ui-design.md`, quoted in the prompt,
- the reply format: one line per image — `<file>: OK` or `<file>: MISMATCH <what, where>` — plus at most 3 lines
  of overall notes. No image descriptions beyond that.

The subagent's context (and every image in it) is discarded when it returns; only the short verdict comes
back. Treat a `MISMATCH` like a red check: fix the code, re-shoot that cell, and send only that image for a
re-check. If the `Agent` tool is unavailable, view the images yourself, staying inside the eyes-on budget.

## Comparing against the approved canvas (when `design-source/` exists)

The snapshot is what the user approved on the Claude Design canvas.
- Try to render it locally (Playwright `file://` on the saved page, same viewport as the app screenshot). If it
  renders, screenshot each `SCR-xx` artboard and the matching app screen side by side into
  `visual-baseline/.pending/compare/`, and check: same token values via computed style (colors, font sizes,
  spacing, radius) by code; same elements present in the same order and same hierarchy by DOM queries where
  possible, and by eye only through the eyes-on subagent above. Layout must match in structure,
  not pixel-for-pixel — real data, fonts and browser rendering differ.
- If it does not render standalone (the canvas may need the claude.ai runtime), fall back to the DAC-xx in
  `ui-design.md`, which ingest derived from the canvas, and note "canvas snapshot not renderable locally" in
  the test report.
- A real mismatch (missing element, wrong token, different structure) is a bug in the code, not in the design:
  fix the code. If the code cannot match without changing behavior → `DESIGN_GAP`.
- Playwright is pre-installed in the environment; do NOT run `playwright install`.

## Boundary with NFR-accessibility

If the requirements already include an a11y NFR, the contrast/focus/label checks here ARE how that NFR is
verified — don't duplicate the work; treat design-fidelity as where a11y checking happens for the UI.
