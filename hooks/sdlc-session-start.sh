#!/usr/bin/env bash
# SDLC plugin — SessionStart hook.
# Nếu dự án đang có tiến trình SDLC dở (.sdlc/state.md), in ra để nhắc chỗ tiếp tục.
# Thuần đọc, không thay đổi gì trong repo.

set -euo pipefail

STATE_FILE=".sdlc/state.md"

if [[ -f "$STATE_FILE" ]]; then
  echo "── SDLC: phát hiện tiến trình đang dở ──"
  # In tối đa 40 dòng đầu của state để không làm ngập context.
  head -n 40 "$STATE_FILE"
  echo "────────────────────────────────────────"
  echo "Gợi ý: chạy /sdlc:status để xem tiến độ, hoặc /sdlc:run <sprint> để làm tiếp."
fi

exit 0
