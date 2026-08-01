---
name: system-design
description: The structural and quality standard for the SDLC design phase's output — architecture, data model/schema, API contracts, UI flow, and the table mapping business rules/edge cases to where they're handled. Use when designing the system for one sprint from its requirements.
---

# System Design

The skill of designing the system for ONE sprint from `requirements.md`, detailed enough that
feature-builder can implement without making architectural decisions itself.

## Before designing: read the context

Grep/Glob the existing codebase to learn its conventions, stack, and existing modules. Read
`.sdlc/architecture.md` (foundational, cross-sprint) and the relevant `CLAUDE.md` files. The design must
fit — don't impose a foreign architecture. For projects adding features to an existing codebase, this is
critical. If the sprint adds/changes shared foundational components → update `.sdlc/architecture.md`.

## Two-layer layout

**PART 1 — Human Review:**
1. Design Overview (main architectural decisions + why)
2. Tech Decisions (new libs/patterns being added — overridable by the user)
3. Risks / Trade-offs

**PART 2 — Agent Reference:**
4. Architecture (components, responsibilities, interactions)
5. Data Model (concrete schema: fields, types, indexes, constraints, relationships)
6. API Contracts (method, path, request, success + error response, status, auth)
7. UI / Interaction Flow (screens, states, empty/loading/error)
8. **Rule & Edge-case Mapping** (table: each RULE-xx / EC-xx / NFR-xx → where it's handled)
9. NFR Design (how each NFR-xx is met: indexes, authz, caching, rate limits…)
10. Regression-safe Plan (how to change existing modules without breaking behavior — backward compatible)
11. File Change Plan (files created / modified)

## The key rule: 100% rule & edge case coverage

Section 8 is the evidence that the design covers the requirements. EVERY `RULE-xx`, `EC-xx`, and `NFR-xx`
must appear in the table, mapped to a specific handling point (which validation, which error response,
which state, which index/authz). This is the single most important checkpoint for avoiding minor bugs
during execute/test.

## API errors must be designed, not left to chance

Each endpoint declares an explicit error response shape + status code for the related ECs
(400/401/403/404/409/422…). This is a major reason manual testing doesn't hit "unexpected API errors".

## Self-review checklist before finalizing

- [ ] Is every RULE-xx in the mapping table (section 8)?
- [ ] Does every EC-xx have corresponding error handling in the API/UI?
- [ ] Does the design fit the existing conventions/stack?
- [ ] Any extra endpoints/entities the requirements didn't ask for? (consider dropping them)
