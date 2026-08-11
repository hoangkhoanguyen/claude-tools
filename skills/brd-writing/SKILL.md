---
name: brd-writing
description: Write and complete a Business Requirements Document (BRD) — the business-level "what & why" of an initiative — from any input the user gives (meeting notes, transcripts, emails, a rough brief, an old draft, or several sources at once). Beyond drafting, it iteratively self-reviews to hunt gaps and conflicts, resolving each by inference or by asking the user with concrete options, until the document converges. Trigger when the user wants to write, draft, or structure a BRD, a "business requirements document", or a "tài liệu yêu cầu nghiệp vụ" / "tài liệu nghiệp vụ" — including turning raw notes into a formal doc for stakeholder sign-off, even without the word "BRD". Business requirements only (needs, objectives, scope, stakeholders) — NOT a PRD or feature spec, an FRD or technical design (APIs, DB, "how"), sprint user-stories + acceptance criteria, meeting-summary action items, or end-user manuals.
---

# BRD Writing

The skill of turning raw source material into a **Business Requirements Document** — a document that
answers **WHAT the business needs and WHY it matters**, in the language of business stakeholders.

The value of a BRD is alignment and sign-off: a project sponsor, a business owner, and a delivery team
should read it and agree on the same scope before anyone designs a solution. So the writing has to be
unambiguous, grounded in the source material, and honest about what is still undecided.

## The one rule that defines a BRD: "what & why", never "how"

A BRD is not a technical spec, not a PRD, not an FRD. It captures the business *need* and the *reason*,
and deliberately stops short of the solution.

- ✅ "Khách hàng cần nhận được xác nhận đơn hàng trong vòng 1 phút sau khi đặt, để yên tâm giao dịch đã thành công."
- ❌ "Hệ thống gửi email qua SendGrid API, trigger bởi webhook khi order.status = confirmed."

The second sentence is a *solution* — it belongs in an FRD/technical design, not a BRD. When source
material already contains solution detail, lift out the underlying business need and record the solution
detail (if useful) only as an assumption or constraint, clearly labeled. If you catch yourself naming a
technology, a table, an API, or a UI widget in a requirement, you've drifted into "how" — pull back to the
need behind it.

## Language & format

- **Output language: Vietnamese by default.** Switch only if the user asks for another language in their
  prompt.
- **Format: Markdown by default** (easy to review and commit). If the user asks for a Word document / file
  to send for sign-off, produce a `.docx` — use the `docx` skill for that, keeping the same structure.
- Use tables, numbered lists, and — where a process or flow is involved — a Mermaid diagram, because a
  picture of an as-is / to-be flow removes far more ambiguity than a paragraph.

## Input: any material the user gives — extract, don't invent

Accept **whatever input type the user specifies in their prompt** — meeting notes, a call transcript, an
email thread, an old PRD/BRD to rewrite, a spreadsheet, screenshots, a voice-to-text dump, several sources
at once, or just a spoken idea. Don't demand a particular format; work with what you're given. When there
are **multiple sources**, read all of them and watch for places where they disagree — those become
conflicts to resolve later (see the completion loop). Read everything first, then:

1. **Extract** the business need, the objective, the stakeholders, and the scope that are actually stated
   or clearly implied.
2. **Never invent** requirements, metrics, dates, or budgets that aren't supported by the source. A
   fabricated "success metric: increase revenue 20%" is worse than none — it looks authoritative and
   misleads sign-off.
3. **Surface the gaps.** Every place the source is silent or contradictory becomes either an **Open
   Question** (the user must decide — you can't safely assume) or a **Key Assumption** (a reasonable
   default you've taken, which the user can override). This is the single most useful thing the skill
   does: it turns "I have messy notes" into "here's a structured doc plus a short list of exactly what's
   still missing."

If the user gives only a rough idea and no documents, still write the BRD, but expect the Open Questions /
Assumptions sections to carry more weight — and it's fine to ask 3–5 sharp questions up front if the gaps
are large enough that guessing would waste everyone's time.

## Two-layer structure (Human Review first)

Stakeholders read the top and skim the rest. Put a short review-oriented block first, the detail after.

**PART 1 — Human Review (top of the document, keep it short):**
1. Executive Summary — the problem, the proposed outcome, and the business value, in a few sentences.
2. Business Objectives & Success Metrics — the "why", tied to measurable outcomes.
3. Scope — ✅ in-scope / ❌ out-of-scope, explicit. Scope disputes are the #1 cause of overruns, so err
   toward stating more, not less.
4. Open Questions — ambiguities only the user/stakeholders can resolve.
5. Key Assumptions — defaults you took independently, overridable by the user.

**PART 2 — Detail (the body):**
6. Background & Business Context — the situation, the current pain, why now.
7. Stakeholders — who's involved and their role (a simple RACI table when there are several).
8. Business Requirements — the numbered core (`BR-01`, `BR-02`, …), each a business need, prioritized.
9. Business Process Flows — as-is vs to-be, ideally a Mermaid diagram.
10. Assumptions & Constraints — timeline, budget, regulatory, technical, and organizational limits.
11. Non-Functional Requirements — only those the business genuinely cares about (compliance, availability,
    data retention, performance targets the business stated). Skip if none apply.
12. Risks & Mitigation — what could derail the initiative and how it's contained.
13. Timeline & Milestones / Budget — only if the source supports real figures; otherwise mark as TBD in
    Open Questions rather than inventing.
14. Glossary — domain terms and acronyms.
15. Approval / Sign-off — the names/roles who must approve.

**Scale the depth to the project** (the user chose "flexible by size"):
- **Small / quick** initiative → sections 1–5 plus 8 (Business Requirements) may be enough; fold context
  into the summary and drop empty sections rather than filling them with filler.
- **Medium** → all of Part 1 plus 6, 7, 8, 10, 12, 14.
- **Large / formal** (needs executive sign-off, budget, compliance) → the full template.

Never pad a small project into the full template, and never strip a large one down so far that sign-off
can't happen. Choose deliberately and, if unsure, say which size you assumed.

The full section-by-section template with prompts and a worked mini-example lives in
[references/template.md](references/template.md) — read it when drafting so each section is filled to the
right depth and nothing standard is missed.

## Quality rules

- **Testable & specific.** Vague words ("cải thiện", "nhanh hơn") can't be signed off — quantify them
  ("trong vòng X giây", "giảm Y%").
- **Numbered & prioritized** (`BR-01` … with Must / Should / Could) so stakeholders negotiate scope
  explicitly instead of arguing over one flat list.
- **Plain business language** any non-technical sponsor understands; expand acronyms in the Glossary.

(These three are also enforced by the review lenses below — the loop is where they actually get checked.)

## Completing the BRD: iterate until it survives 3 clean reviews

The real job of this skill is not to produce a first draft — it's to *finish* the document: drive it to a
state where a skeptical sponsor could sign off without a follow-up meeting. A first draft always has holes;
the value is in hunting them down. So after drafting, run a review loop and don't stop early.

### One review cycle

Build the first draft from whatever input the user gave, then run this cycle — and keep running it:

1. **Review once.** Sweep the current document through one lens (rotate lenses across cycles — see below)
   and list every gap and conflict you find. Track them in a scratchpad or `TodoWrite` so cycles build on
   each other instead of rediscovering the same holes. For each finding, work out **an inference and a
   proposal** — never just name the hole.
2. **Resolve every finding — but only interrupt the user when you truly must:**
   - **Self-inferable** (a safe default exists from the input or ordinary domain practice, and being
     slightly wrong is cheap to fix) → **bypass the user entirely**: apply the inference, record it as a
     Key Assumption (`AS-xx`) so it's visible and overridable, and move on. Do **not** stop to ask.
   - **Needs a user decision** (it materially changes scope, cost, timeline, or business behavior, or two
     sources genuinely conflict and you can't safely pick) → present 2–4 concrete options plus your
     recommendation via `AskUserQuestion`. Batch a cycle's must-ask items into as few calls as possible
     (up to 4 questions per call) rather than interrupting once per gap.
   - **Can't infer and can't ask right now** → park it as an **Open Question (`OQ-xx`)**. Never invent hard
     facts (numbers, dates, budget, legal/compliance) to fill a hole — a fabricated figure that looks
     authoritative is worse than an open one.
3. **Update** the document with everything resolved this cycle. Edit only what changed — don't re-emit the
   whole BRD each cycle; that wastes tokens and buries the diff.
4. **Re-review** — that starts the next cycle.

A cycle in which every finding was self-inferable (zero questions asked) is still a full cycle. And a cycle
that found nothing at all is a **clean** cycle.

### The stop condition: 3 clean cycles in a row

If a cycle surfaces **any** new gap or conflict — even ones you fixed yourself by inference — the document
just changed, so **reset the clean-cycle counter to 0**. **Declare the BRD finished only after 3
consecutive cycles find nothing new.** "Looks complete" is not the bar; three-clean-in-a-row is.

Why three consecutive: the first fix routinely creates the second problem — resolving a scope gap can
contradict a metric, adding a requirement can strand a stakeholder — so one clean cycle often just means
you stopped looking. Three in a row, each from a different angle, is what forces real convergence.

### What counts as a gap or a conflict

- **Gaps** — a missing objective or success metric; scope silent on an obvious in/out question; a
  requirement with no priority or that isn't measurable; a stakeholder with no role; an acronym missing
  from the glossary; a known constraint with no matching risk; a dangling reference (`BR-07` mentioned but
  not defined).
- **Conflicts** — two requirements that contradict; in-scope overlapping out-of-scope; a metric that
  doesn't serve its stated objective; a requirement that violates a constraint; a RACI with two
  Accountable; a timeline that can't fit the scope; and — importantly with multiple inputs — **source A
  saying one thing and source B another**.

### Review lenses (rotate them; a clean cycle must survive all four)

Run a different lens each cycle so three clean cycles mean three kinds of scrutiny, not the same check
thrice:

- **Completeness** — is every section the project's size warrants filled with real content, not
  placeholder? Every BR prioritized, every objective metricized, every obvious scope question answered.
- **Consistency** — does any pair of statements contradict, across sections and across sources?
- **Testability & traceability** — is every requirement specific and measurable, and defensible from the
  input? Vague words ("cải thiện", "nhanh hơn") get quantified or flagged; every number/date/budget is
  sourced, inferred-as-assumption, or parked — never invented.
- **Adversarial sign-off** — read as a skeptical sponsor: "what would I reject or send back?" Unowned
  decisions, scope that could balloon, a risk nobody named.

### Terminal states (so the loop can't run forever)

Some gaps are genuinely the user's decision and may stay unanswered in a session. Don't loop endlessly
waiting on them. Two valid ways to finish:

- **Complete** — 3 clean cycles and no open questions. Ready for sign-off.
- **Complete pending decisions** — 3 clean cycles on everything inferable; what remains is a short list of
  Open Questions already put to the user via `AskUserQuestion`. State this plainly and list exactly which
  decisions still block final sign-off.

When you report done, say which terminal state you reached and, if the repo has a `self-review` skill, run
it as the final gate.
