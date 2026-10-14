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

- Screenshot each main screen/state at the defined breakpoints + dark/light.
- Compare against the Design AC (color codes via computed style, layout not overflowing/overlapping).
- If a baseline exists (`.sdlc/<version>/<sprint>/visual-baseline/`): compare to catch visual regressions.
  With no baseline yet → create one after confirming it matches the Design AC.

## Comparing against the approved canvas (when `design-source/` exists)

The snapshot is what the user approved on the Claude Design canvas.
- Try to render it locally (Playwright `file://` on the saved page, same viewport as the app screenshot). If it
  renders, screenshot each `SCR-xx` artboard and the matching app screen side by side into
  `visual-baseline/.pending/compare/`, and check: same elements present in the same order, same hierarchy,
  same token values via computed style (colors, font sizes, spacing, radius). Layout must match in structure,
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
