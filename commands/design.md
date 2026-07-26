---
description: Chạy riêng phase design cho một sprint — từ requirements tạo architecture, data model, API contracts, UI flow và bảng ánh xạ rule/edge case.
argument-hint: <sprint-slug>
---

# /sdlc:design

Chạy riêng phase thiết kế cho sprint `$1` (nếu trống, lấy từ `.sdlc/state.md`).

Yêu cầu `requirements.md` của sprint đã tồn tại (chạy `/sdlc:analyze` trước nếu chưa).

Spawn subagent `architect`, dùng skill `system-design`. Đọc codebase hiện có để ăn khớp convention.
Ghi `.sdlc/<sprint>/design.md` với 2 tầng + bảng Rule & Edge-case Mapping phủ 100% RULE/EC.

Kết thúc: chạy skill `self-review` (checklist sau design). Cập nhật `.sdlc/state.md`.

Đây là phase con của `/sdlc:run`; dùng khi muốn chạy/rà lại riêng phase design.
