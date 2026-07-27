---
description: Thực thi MỘT task cụ thể trong sprint — pre-flight, implement, test cục bộ, cập nhật status. Dùng khi muốn chạy thủ công từng task thay vì cả sprint.
argument-hint: <version-slug> <sprint-slug> <task-id>
---

# /sdlc:task

Thực thi task `$3` trong sprint `$2` thuộc version `$1`.

Yêu cầu `.sdlc/<version>/<sprint>/tasks.md` đã tồn tại (chạy `/sdlc:tasks` trước nếu chưa).
Task phải có status `todo` hoặc `doing`.

## Pre-flight

Kiểm tra `.sdlc/<version>/state.md` xem đã có `services_confirmed: true` chưa.

**Chưa có**: suy ra service ngoài cần thiết từ config dự án (docker-compose, .env.example,
package.json scripts, Makefile, Procfile). Bash ping/check port từng cái. Hỏi user bật cái còn
thiếu kèm lệnh gợi ý, đợi xác nhận "ok". Ghi `services_confirmed: true` vào state.
Migration nếu sprint đổi schema.

**Đã có**: bỏ qua, không hỏi lại.

## Implement

Nạp context: đọc các `CLAUDE.md` liên quan (nguyên tắc 0) + `.sdlc/architecture.md` + design của sprint.
Đọc chi tiết task `$3` từ `tasks.md` (mô tả, AC/EC phục vụ, design ref, file dự kiến, tiêu chí test).

Spawn `feature-builder`:
- Implement theo đúng phạm vi task — không làm thêm task khác.
- Chạy test cục bộ đến khi pass.
- Self-review (skill `self-review`): đủ EC? không còn TODO/hardcode? test xanh thật?

Cập nhật status task trong `.sdlc/<version>/<sprint>/tasks.md`: `todo` → `done`.
Cập nhật TodoWrite + `.sdlc/<version>/state.md`.

## Kết thúc

Báo task done. Đọc `tasks.md`, xác định task tiếp theo chưa done (theo thứ tự phụ thuộc), gợi ý:

> ✅ TASK-XX done. Task tiếp: `/sdlc:task <version> <sprint> TASK-YY — <mô tả ngắn>`
> Hoặc chạy tất cả còn lại: `/sdlc:execute <version> <sprint>`
