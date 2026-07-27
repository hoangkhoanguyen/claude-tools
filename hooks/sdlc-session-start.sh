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
  echo "── SDLC: phát hiện tiến trình đang dở ($STATE_FILE) ──"
  # In tối đa 40 dòng đầu của state để không làm ngập context.
  head -n 40 "$STATE_FILE"
  echo "────────────────────────────────────────"
  echo "Gợi ý: chạy /sdlc:status để xem tiến độ, hoặc /sdlc:run <version> <sprint> để làm tiếp."
fi

exit 0
