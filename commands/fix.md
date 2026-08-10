---
description: Report a bug — text, screenshot, log, stack trace, or any mix of these — and drive it through investigate → fix → verify → commit until it's resolved.
---

# /fix

Generic, stack-agnostic bug-fix pipeline. Works standalone; does not depend on `.sdlc/` or the SDLC
workflow. Input: `$ARGUMENTS` — a free-form bug description, optionally with file paths to a screenshot,
log file, or stack trace.

## Context discipline (same principle as the SDLC plugin)

This command only orchestrates and talks to the user. It does NOT read source files, does NOT explore the
codebase, and does NOT read `CLAUDE.md` on any agent's behalf — every subagent below starts cold and loads
its own context. Relay each subagent's report to the user close to verbatim; don't re-summarize from
scratch (that means re-reading what you don't need to).

## Handling image/log input

- If the user attached a file path (screenshot, log file, crash report), pass the path straight through in
  the prompt to `bug-investigator` — it will `Read` the file itself (Read supports images).
- If the user pasted an image inline in chat with no file path, describe in 1-2 sentences what the image
  shows when you write the `bug-investigator` prompt — the subagent starts cold and cannot see the chat,
  only the text you hand it.

## Steps

1. **Investigate.** Spawn `bug-investigator` (foreground — its result gates everything after) with the raw
   bug description and any attachments. It reproduces, finds the root cause, and either:
   - fixes it directly if trivial, or
   - hands back a root-cause report for `bug-fixer`, or
   - reports it can't proceed without more information.

   Branch on its first line:
   - `STATUS: NEEDS_INFO` → stop here. Relay its specific questions to the user verbatim. Do not guess at
     missing details yourself.
   - `STATUS: FIXED_TRIVIAL` → skip straight to step 3 (verify + commit).
   - `STATUS: ROOT_CAUSE_FOUND` → continue to step 2.

2. **Fix.** Spawn `bug-fixer` (foreground) with the root-cause report from step 1. It edits code and closes
   its own fix→test loop internally (up to 5 attempts on its own model).
   - `STATUS: DONE` → continue to step 3.
   - `STATUS: BLOCKED` → respawn `bug-fixer` **exactly once more**, passing `model: "opus"` and the full
     attempt history from the `BLOCKED` report verbatim (it needs the history — it starts cold otherwise
     and repeats the same failed attempts).
     - Still `BLOCKED` after the Opus attempt → stop. Report to the user what was tried and why it failed.
       Do not spawn `bug-reporter` — nothing to commit.

3. **Report & commit.** Spawn `bug-reporter` with: the root-cause description, the diff/patch summary, and
   the test results from whichever of step 1/2 actually produced the fix. It verifies the fix is really in
   the working tree, commits locally (never pushes, never opens a PR), and writes the final summary.

4. **Relay.** Present `bug-reporter`'s report to the user verbatim. Remind them the fix is committed
   **locally only** — they push/open a PR themselves when ready.

## Notes

- Never push, never open a PR, never switch branches — this command's blast radius stops at a local commit.
- If a bug turns out to need touching more than a handful of files or a genuine design decision (not just
  a fix), say so and stop rather than letting `bug-fixer` sprawl — suggest `/sdlc:analyze` or manual
  scoping instead of forcing it through this pipeline.
