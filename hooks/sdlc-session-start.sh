#!/usr/bin/env bash
# SDLC plugin — SessionStart hook.
# Nếu dự án đang có tiến trình SDLC dở, in ra để nhắc chỗ tiếp tục.
# Thuần đọc, không thay đổi gì trong repo.

set -euo pipefail

# Layout chuẩn theo version: .sdlc/<version>/state.md (xem CLAUDE.md nguyên tắc 4a).
# Nhiều version → lấy file sửa gần nhất = version đang làm.
# Vẫn nhận .sdlc/state.md để tương thích layout cũ.
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
  # Chỉ in các trường cần để resume. In cả state (40 dòng) là lãng phí context ở MỌI session —
  # /sdlc:status và /sdlc:run tự đọc đủ file khi thực sự cần.
  echo "── SDLC: tiến trình đang dở ($STATE_FILE) ──"
  grep -E '^\s*-\s+\*\*(current_sprint|current_phase|current_task|next_action|blockers)\*\*' "$STATE_FILE" \
    | sed 's/^[[:space:]]*-[[:space:]]*/  /' \
    || true
  echo "  → /sdlc:status (tiến độ) | /sdlc:run <version> <sprint> (làm tiếp)"
fi

exit 0
