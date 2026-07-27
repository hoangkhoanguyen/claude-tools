---
description: Thực thi MỘT task cụ thể trong sprint — pre-flight, implement, test cục bộ, cập nhật status. Dùng khi muốn chạy thủ công từng task thay vì cả sprint.
argument-hint: [version-slug] [sprint-slug] [task-id]
---

# /sdlc:task

Thực thi thủ công MỘT task trong sprint. (Muốn thực thi đến hết cả sprint — implement + test + qa —
→ dùng `/sdlc:execute`.)

## Xác định task cần chạy

- **Đủ tham số** (`$1 $2 $3`): chạy task `$3` trong sprint `$2` version `$1`.
- **Thiếu version/sprint**: lấy từ `.sdlc/versions.md` (version active) + `.sdlc/<version>/state.md`
  (sprint đang dở).
- **Thiếu task-id (`$3` trống)**: đọc `.sdlc/<version>/<sprint>/tasks.md`, in danh sách các task
  **chưa done** (kèm ID + mô tả ngắn + trạng thái phụ thuộc) và để user chọn — ưu tiên `AskUserQuestion`
  render chip bấm được; nếu không thì đánh số cho user chọn. Chỉ liệt kê task còn phải làm, không hiện task done.

Yêu cầu `.sdlc/<version>/<sprint>/tasks.md` đã tồn tại (chạy `/sdlc:tasks` trước nếu chưa).
Task đã chọn phải có status `todo` hoặc `doing`. Nếu đã `done` → báo user, không làm lại.

## Dependency check

Đọc phần "Phụ thuộc" của task đã chọn trong `tasks.md`. Nếu có task phụ thuộc mà CHƯA `done`
→ DỪNG, cảnh báo user và gợi ý chạy task phụ thuộc trước (trừ khi user yêu cầu vẫn tiếp).

## Pre-flight

Đọc `.sdlc/<version>/state.md`, xem `services_up` đã liệt kê service cần cho task này chưa.

**Chưa đủ**: suy ra service ngoài cần thiết từ config dự án (docker-compose, .env.example,
package.json scripts, Makefile, Procfile). Bash ping/check port từng cái. Hỏi user bật cái còn
thiếu kèm lệnh gợi ý, đợi xác nhận "ok". Ghi service đã xác nhận vào `services_up` trong state.
Migration nếu sprint đổi schema.

**Đã đủ**: bỏ qua, không hỏi lại.

## Implement

Nạp context: đọc các `CLAUDE.md` liên quan (nguyên tắc 0) + `.sdlc/architecture.md` + design của sprint.
Đọc chi tiết task đã chọn từ `tasks.md` (mô tả, AC/EC phục vụ, design ref, file dự kiến, tiêu chí test).

Trước khi code: đặt task đã chọn = `doing` trong `tasks.md`; trong state đặt
`current_phase: execute`, `current_task: <task-id>`, `execute: doing`.

Spawn `feature-builder`:
- Implement theo đúng phạm vi task — không làm thêm task khác.
- Chạy test cục bộ đến khi pass.
- Self-review (skill `self-review`): đủ EC? không còn TODO/hardcode? test xanh thật?

Sau khi self-review pass: đặt task đã chọn = `done` trong `.sdlc/<version>/<sprint>/tasks.md` + TodoWrite.
Nếu không hoàn thành được (thiếu điều kiện, lỗi ngoài phạm vi) → đặt `blocked` kèm lý do, không đặt `done`.
Cập nhật `.sdlc/<version>/state.md` (`current_task`, `updated_at`; nếu MỌI task đã `done` thì `execute: done`).

## Kết thúc

Báo task done. Đọc `tasks.md`, xác định task tiếp theo chưa done (theo thứ tự phụ thuộc), gợi ý:

> ✅ TASK-XX done. Task tiếp: TASK-YY — <mô tả ngắn>.
> Chạy tiếp: `/sdlc:task` (chọn từ list) — hoặc chạy tất cả còn lại: `/sdlc:execute <version> <sprint>`
