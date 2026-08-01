---
name: requirements-analysis
description: The structural and quality standard for the SDLC analyze phase's output — user stories, testable acceptance criteria, business rules, data entities, edge cases. Use when turning a sprint's business logic docs into requirements so the design and task-breakdown agents get it right.
---

# Requirements Analysis

The skill of turning ONE sprint's business logic docs (supplied by the user) into structured requirements.
Goal: the user only needs to review the first few sections, while the rest is explicit enough that
downstream agents never have to guess.

## Two-layer layout

**PART 1 — Human Review (at the top of the file):**
1. Sprint Goal & Scope (✅ in scope / ❌ out of scope)
2. Open Questions (ambiguities the user must decide)
3. Key Assumptions (decisions made independently, overridable by the user)

**PART 2 — Agent Reference (the details):**
4. User Stories + AC
5. Business Rules
6. Data Entities & Constraints
7. Edge Cases Registry
8. Integration Touchpoints
9. Non-functional Requirements (NFR-xx): performance / security / a11y / i18n — only what's relevant to the sprint
10. Regression Impact (only when adding to an existing codebase): existing features/modules that may be affected
11. Definition of Done (including NFRs + no regressions)

## Quality rules

- **AC must be testable**: use `GIVEN <state> WHEN <action> THEN <result>`. Don't write vague AC
  ("works well", "is fast").
- **Business rules explicit and numbered** (`RULE-01`), not prose. Include conditions, formulas, constraints.
- **Edge cases tied to a rule/story** (`EC-01 [RULE-03]: … → …`) so developers and tests don't miss them.
- **Don't invent** requirements beyond the source docs. Ambiguity → Open Questions or Key Assumptions.
- **Stay within the sprint's scope**, don't analyze the whole project.

## Why this structure reduces downstream errors

```
Explicit Business Rules + Edge Cases → architect designs the right validation/error handling
Clear "out of scope"                 → no over-design, nothing built by mistake
GIVEN/WHEN/THEN-style AC             → test-strategist & qa-guard can verify automatically
Open Questions resolved before Design → execute doesn't get blocked halfway
Assumptions recorded                 → the user catches wrong inferences
```

## Self-review checklist before finalizing

- [ ] Can the architect design from this file without guessing?
- [ ] Does every story have testable AC? Does every rule have related edge cases?
- [ ] Any requirement invented beyond the source? (delete it)
- [ ] Any Open Question that could be resolved safely? (move to Assumptions)
