---
name: codex-dispatch
description: How `implement-coordinator` offloads qualifying batches of `Difficulty: normal` tasks to Codex CLI instead of `feature-builder` — which batches qualify, the self-contained prompt, the exact command, whole-batch validation, discard-and-fall-back rules, and how a failed Codex attempt counts in the retry ladder. Load it ONLY when the caller passed `codex_enabled: true`.
---

# Codex dispatch (only when `codex_enabled: true`)

If the caller did not pass `codex_enabled: true`, none of this applies — every task goes to `feature-builder`.

**Which batches qualify for Codex:** a batch qualifies only if EVERY task in it is `Difficulty: normal`
(not `high`) AND has no `Suggested skill` field that names a project skill (a skill is a Claude-specific
asset — Codex can't load it, so those stay with `feature-builder`, which can). Everything that doesn't
qualify goes straight to `feature-builder` — don't force a batch onto Codex just because the flag is on.
Codex gets the whole batch in one run (ordered tasks); validation covers the WHOLE batch (commits stay per
task / per shared-file group, see the coordinator's Step 4).

**Codex only touches source files — it never touches your state.** Same boundary as `feature-builder`:
Codex implements + runs its own local checks; the coordinator still does the git commit and the
`tasks.md`/`state.md` writes, and validates the result before trusting it, since Codex doesn't speak the
feature-builder report contract.

## Dispatch (round 1 for a qualifying batch, before falling back to `feature-builder`)

1. Build a **self-contained prompt** — Codex starts cold, same as any subagent:
   - The full block of each task in the batch from `tasks.md`, in order (description, AC/EC served, design
     ref, expected files, `Done when:` (or legacy `Test:`) criteria, the `Tests:` items to write with their
     stated expected values), plus any Prior findings for the batch's files. Ask it to implement the tasks in
     order and keep each task's files distinguishable. Tell it NOT to return a code map.
   - The relevant section(s) of `design.md` (paste the section, don't just cite it).
   - The relevant `CLAUDE.md` conventions for the files the batch touches (paste the key rules: build/test
     commands, style conventions, forbidden patterns).
   - The tasks' test command(s) explicitly (scoped to the touched module — never repo-wide), and an
     instruction to write the `Tests:` items and run them before finishing.
   - An explicit instruction: implement ONLY these tasks' scope, don't touch unrelated files.
2. Run it non-interactively via Bash:
   ```
   npx @openai/codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check \
     "<the prompt built above>"
   ```
   Run from `<repo-root>` so Codex resolves relative paths correctly. The `exec` subcommand is
   required for non-interactive use — flags like `--skip-git-repo-check` are not available on the
   root `codex` command. `-s workspace-write` and `--approve-for-me` are mutually exclusive with
   `--dangerously-bypass-approvals-and-sandbox` and must NOT be combined with it.
3. **Validate the result yourself, for the whole batch** (Codex's own "it passed" is not enough — verify it):
   - `git diff --stat` → does the changed-file list match the batch's tasks' "Expected files"? Wildly
     out-of-scope changes → treat as a failed attempt, don't commit them. Split the changed files per task
     for the commits (use each task's Expected files/tests to attribute them without asking; a file claimed
     by two tasks makes them a shared-file group).
   - Re-run each task's scoped test command(s) yourself (not repo-wide suites), and check the `Tests:`
     items exist.
   - Skim the diff for the same "no minor bugs" checklist `feature-builder` uses: no hardcoded
     secrets/URLs, no leftover TODO/FIXME in scope, error shapes match the design's API contracts.
   - All good → treat exactly like a `feature-builder` "done" report and continue to Step 4.
   - **If ANY task fails validation → discard the WHOLE Codex attempt** (partial acceptance is not allowed:
     the tasks build on each other and attribution inside a Codex diff is unreliable). `git checkout -- <touched
     files>` AND remove the untracked files it created (list them from `git status`), note what failed (which
     check, what output), then hand the WHOLE batch to `feature-builder` (Step 3b).

## Falling back to `feature-builder`

If `npx @openai/codex` errors out / isn't authenticated despite the flag being on (auth can expire
mid-sprint), treat it the same: clean up as above and give the whole batch to `feature-builder` per Step 3b.

**A failed Codex attempt counts as round 1.** `feature-builder` then gets rounds 2-5 (not a fresh budget of 5),
and the Opus round is round 6 (maximum 6 rounds in total) — so a batch that is hard for both executors still
escalates to Opus. Pass the Codex failure notes into `feature-builder`'s prompt as part of the failure history,
same as any retry, and write the failed attempt into `.coordinator/attempts.md`.

## Record for the final report

Which executor actually did each batch/task (`codex`, `sonnet`, `opus`, or the path taken such as
`codex→sonnet→opus`) and the total round count, e.g. `codex→sonnet→opus (6)`.
