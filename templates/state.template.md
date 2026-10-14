<!--
  SCHEMA state.md — the SDLC progress pointer. Lives at .sdlc/<version>/state.md in the project.
  Agents MUST preserve this exact structure (keys, order) for reliable resuming.
  Update it after EVERY phase and EVERY task. Values in <...> are placeholders.
-->

# SDLC State

- **version**: <version-slug>                 # e.g. v1, v2, phase-2
- **current_sprint**: <sprint-slug | none>
- **current_phase**: <analyze | design | tasks | execute | test | qa | done | none>
- **current_task**: <TASK-id | none>          # only meaningful when phase = execute
- **sprint_branch**: <branch name>            # recorded by the caller at pre-flight (the current non-default branch, or `sdlc/<version>-<sprint>` created after asking the user); the coordinator verifies it is checked out and returns BLOCKED "branch mismatch" otherwise, it never switches branches
- **updated_at**: <YYYY-MM-DD HH:MM>

## Resume pointer

- **next_action**: <one-line description of the next step to take when resuming>
- **blockers**: <none | description of the blocker + what the user needs to do>

## Phase status (current sprint)

- has_ui:        <yes | no>                          # written by the caller right after Phase 1 from product-analyst's Human Review block (as are `analyze: done` and `current_phase`); decides the planning path and the test layers. Consumers read it from here; only if absent: `design_ui` not `n/a`, else `ui-design.md` exists
- analyze:       <todo | doing | done>
- ux_map:        <todo | done | n/a>               # ux-map.md + sitemap update, written by product-analyst with requirements.md when has_ui: yes; n/a otherwise
- design_system: <todo | doing | done>              # architect branch
- design_ui:     <todo | doing | waiting-external | awaiting-review | done | n/a>   # ui-designer branch; waiting-external = awaiting an external design; awaiting-review = draft drawn on the Claude Design canvas, waiting for the design gate + ingest; done = ui-design.md final (ingested, or markdown-only when no canvas); n/a if the SPRINT has no screens
- ui_canvas_url: <url | none>                       # the sprint's Claude Design canvas (one per sprint, revised in place); none when the Artifact tool was unavailable
- ui_snapshot_hash: <sha256 | none>                 # hash of the canvas snapshot in <sprint>/design-source/ taken at ingest — what was approved and built
- tasks:         <todo | doing | done>
- execute:       <todo | doing | done>
- test:          <todo | doing | done>              # `done` only when EVERY required test layer is done (the last layer sets it)
- required_layers: <[integration, ui] | [all]>      # written by the caller (run/execute/test) when entering the Test leg: has_ui -> [integration, ui]; no UI or legacy sprint -> [all]
- test_layers_done: <[] | [integration] | [integration, ui] | [all]>   # Test leg runs per layer; each test-strategist run appends its layer after its final commit; callers spawn only layers in required_layers that are missing here (absent = [])
- qa:            <todo | doing | done>
- migration_done: <yes | no | n/a>                  # whether the migrate command was (re)run after the coordinator returned DONE, when the sprint added migrations; n/a if it added none

## Human approval gates

- analyze_approved:  <pending | true>   # true once the user confirmed the requirements before Design
- design_approved:   <pending | true>   # true once the user confirmed the design (and, on a UI sprint, the canvas) — UI sprints then ingest the canvas and write tasks
- tasks_approved:    <pending | true>   # true once the user confirmed the task list before Execute
- reviewer_passed:   <[] | [analyze, design, ui, tasks]>   # analyze = requirements (+ ux-map); design = design.md (+ draft ui-design.md); ui = final ui-design.md vs the canvas snapshot (UI sprints with a canvas); reviewer checks that already returned PASS; a resume skips these and runs the missing ones before their gate; ANY edit to an artifact removes its entry

## Context loaded this run (so the next run knows what to re-read)

- claude_md_relevant: <list of relevant CLAUDE.md files read>
- skills_used: <repo skills detected & used>
- services_up: <external services confirmed running | none>   # `none` is written explicitly when the sprint needs no external service; recorded EARLY — at /sdlc:run STEP 0 (scout `services` mode), before phase 1; re-pinged by the `migration` scout before Execute (down/new services re-asked)
- services_up_sprint: <sprint-slug>                 # the sprint services_up was confirmed for; the early check is skipped ONLY when it equals the current sprint (reset services_up / test_layers_done / required_layers on a new sprint)
- codex_enabled: <true | false>                     # set once, in the same early turn as services_up (or at execute pre-flight for standalone /sdlc:execute); kept for a whole multi-sprint invocation; offload Difficulty:normal tasks to Codex CLI
- has_design: <yes | no>                            # does the project have a DESIGN.md / design system
- ui_design_source: <internal | external | mixed | none>   # internal = fully generated by the workflow; external = 100% of screens from the external design (input at .sdlc/<version>/<sprint>/ui-design.input.md); mixed = external covers part, the workflow generates the missing screens; none = the sprint has no UI
