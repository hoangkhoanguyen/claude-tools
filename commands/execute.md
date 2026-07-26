---
description: Chạy riêng phase execute cho một sprint — pre-flight yêu cầu bật service ngoài, rồi implement từng task, test cục bộ, cập nhật status để resume.
argument-hint: <sprint-slug>
---

# /sdlc:execute

Chạy riêng phase thực thi cho sprint `$1` (nếu trống, lấy từ `.sdlc/state.md`).

Yêu cầu `tasks.md` của sprint đã tồn tại (chạy `/sdlc:tasks` trước nếu chưa).

## Pre-flight (BẮT BUỘC trước khi code)

1. Đọc design + tech stack → liệt kê service/tool ngoài cần chạy (DB, cache, dev server, sandbox 3rd party).
2. Bash ping/check port xem cái nào đang chạy.
3. CHỈ hỏi user bật cái còn thiếu, kèm lệnh gợi ý. ĐỢI user xác nhận "ok" rồi mới tiếp tục.

## Implement

Spawn subagent `feature-builder`, chạy task tuần tự (song song nếu độc lập). Mỗi task:
implement → test cục bộ → pass → cập nhật `tasks.md` + TodoWrite + `.sdlc/state.md` → task tiếp.
Self-review sau mỗi task (skill `self-review`): đủ EC? còn TODO/hardcode/debug? test pass thật?

Resume: bỏ qua task đã `done`, tiếp tục task đang dở. Kết thúc: tóm tắt task done / còn lại / blocker.
