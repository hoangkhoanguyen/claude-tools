---
description: Chạy riêng phase chia tasks cho một sprint — từ design tạo danh sách task thực thi được, có phụ thuộc, checkpoint-able, phủ đủ AC/EC.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:tasks

Chạy riêng phase chia task cho sprint `$2` thuộc version `$1`
(nếu trống, lấy từ `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

Yêu cầu `.sdlc/<version>/<sprint>/design.md` đã tồn tại (chạy `/sdlc:design` trước nếu chưa).

Dùng skill `task-breakdown`. Ghi `.sdlc/<version>/<sprint>/tasks.md` với các task (status `todo`),
phụ thuộc, đánh dấu task chạy song song được, và bảng AC/EC → task. Đồng bộ TodoWrite.

Kết thúc: chạy skill `self-review` — mọi AC/EC phải có task phụ trách.
Cập nhật `.sdlc/<version>/state.md`.

Đây là phase con của `/sdlc:run`; dùng khi muốn chạy/rà lại riêng phase chia task.
