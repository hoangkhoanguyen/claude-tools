---
description: Chạy riêng phase chia tasks cho một sprint — từ design tạo danh sách task thực thi được, có phụ thuộc, checkpoint-able, phủ đủ AC/EC. Chỉ tạo tài liệu, không execute.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:tasks

Chạy riêng phase chia task cho sprint `$2` thuộc version `$1`
(nếu trống, lấy từ `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

Yêu cầu `.sdlc/<version>/<sprint>/design.md` đã tồn tại (chạy `/sdlc:design` trước nếu chưa).

## Chỉ tạo tài liệu — KHÔNG execute

Phase này **chỉ chia task và ghi tài liệu**. Không implement code, không pre-flight service.
Thực thi bắt đầu từ `/sdlc:task` (từng task thủ công) hoặc `/sdlc:execute` (toàn sprint tuần tự).

## Quy trình

Dùng skill `task-breakdown`. Ghi `.sdlc/<version>/<sprint>/tasks.md` với các task (status `todo`),
phụ thuộc, đánh dấu task chạy song song được, và bảng AC/EC → task. Đồng bộ TodoWrite.

Kết thúc: chạy skill `self-review` — mọi AC/EC phải có task phụ trách.
Cập nhật `.sdlc/<version>/state.md`.

## Sinh command shortcuts

Sau khi `tasks.md` hoàn chỉnh và self-review pass, ghi `.sdlc/<version>/<sprint>/commands.md`
theo mẫu sau (điền đúng version, sprint, task IDs và mô tả ngắn từ tasks.md):

```
# Sprint Commands — <sprint-slug>

## Chạy từng task (thủ công)
# Gõ /sdlc:task (không tham số) để chọn task từ list; hoặc chỉ đích danh:
/sdlc:task <version> <sprint> TASK-01   # <mô tả ngắn task 01>
/sdlc:task <version> <sprint> TASK-02   # <mô tả ngắn task 02>
...

## Chạy phần thực thi đến hết (implement + test + qa + bàn giao)
/sdlc:execute <version> <sprint>
```

Sau khi ghi xong `commands.md`, in nội dung file đó ra cho user thấy ngay.

Đây là phase con của `/sdlc:run`; dùng khi muốn chạy/rà lại riêng phase chia task.
