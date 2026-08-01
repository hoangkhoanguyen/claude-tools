#!/usr/bin/env bash
# SDLC plugin — SessionStart hook.
# If the project has an SDLC run in progress, print it as a reminder of where to continue.
# Read-only; changes nothing in the repo.

set -euo pipefail

# Standard per-version layout: .sdlc/<version>/state.md (see CLAUDE.md principle 4a).
# Multiple versions → take the most recently modified file = the version being worked on.
# Still accepts .sdlc/state.md for compatibility with the old layout.
shopt -s nullglob
candidates=(.sdlc/*/state.md .sdlc/state.md)
shopt -u nullglob

if (( ${#candidates[@]} == 0 )); then
  exit 0
fi

STATE_FILE=""
for f in "${candidates[@]}"; do
  if [[ -z "$STATE_FILE" || "$f" -nt "$STATE_FILE" ]]; then
    STATE_FILE="$f"
  fi
done

if [[ -f "$STATE_FILE" ]]; then
  echo "── SDLC: run in progress ($STATE_FILE) ──"
  # Print at most the first 40 lines of state so the context isn't flooded.
  head -n 40 "$STATE_FILE"
  echo "────────────────────────────────────────"
  echo "Next: /sdlc:status for progress, or /sdlc:run <version> <sprint> to continue."
fi

exit 0
