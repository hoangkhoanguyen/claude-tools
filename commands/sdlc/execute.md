---
description: Chạy riêng phase execute cho một sprint — pre-flight yêu cầu bật service ngoài, rồi implement từng task, test cục bộ, cập nhật status để resume.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:execute

Chạy riêng phase thực thi cho sprint `$2` thuộc version `$1`
(nếu trống, lấy từ `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

Yêu cầu `.sdlc/<version>/<sprint>/tasks.md` đã tồn tại (chạy `/sdlc:tasks` trước nếu chưa).

## Pre-flight (BẮT BUỘC trước khi code)

0. **Nạp context**: đọc các `CLAUDE.md` liên quan (nguyên tắc 0) + `.sdlc/architecture.md`.
1. **Phát hiện skill dùng được trong repo.** Quét `.claude/skills`, `.claude/agents`, `.claude/commands`
   của dự án, skill từ `pluginDirs`, và skill built-in đang khả dụng.
2. **Suy ra service ngoài từ config dự án**: đọc `docker-compose.yml`, `.env.example`, `package.json`
   scripts, `Procfile`, `Makefile`, README → liệt kê DB/cache/dev server/sandbox 3rd party kèm port +
   lệnh khởi động chuẩn.
3. Bash ping/check port xem cái nào đang chạy.
4. CHỈ hỏi user bật cái còn thiếu, kèm lệnh gợi ý. ĐỢI user xác nhận "ok" rồi mới tiếp tục.
   Ghi service đã xác nhận vào `.sdlc/<version>/state.md`.
5. **Migration**: nếu sprint đổi schema → xác định lệnh migrate của dự án và chạy trước khi test.
   Ghi vào state.

## Implement

Spawn subagent `feature-builder`, chạy task tuần tự (song song nếu độc lập). Mỗi task:
implement → test cục bộ → pass → cập nhật `.sdlc/<version>/<sprint>/tasks.md` + TodoWrite +
`.sdlc/<version>/state.md` → task tiếp. Self-review sau mỗi task (skill `self-review`).

Resume: bỏ qua task đã `done`, tiếp tục task đang dở. Kết thúc: tóm tắt task done / còn lại / blocker.
