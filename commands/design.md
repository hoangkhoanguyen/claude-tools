---
description: Chạy riêng phase design cho một sprint — từ requirements tạo architecture, data model, API contracts, UI flow và bảng ánh xạ rule/edge case.
argument-hint: <sprint-slug>
---

# /sdlc:design

Chạy riêng phase thiết kế cho sprint `$1` (nếu trống, lấy từ `.sdlc/state.md`).

Yêu cầu `requirements.md` của sprint đã tồn tại (chạy `/sdlc:analyze` trước nếu chưa).

Spawn subagent `architect`, dùng skill `system-design`. Đọc codebase + `.sdlc/architecture.md` + CLAUDE.md
liên quan để ăn khớp convention. Ghi `.sdlc/<sprint>/design.md` với 2 tầng + bảng mapping phủ 100%
RULE/EC/NFR + Regression-safe Plan cho module cũ. Cập nhật `.sdlc/architecture.md` nếu đổi thành phần nền tảng.

Kết thúc: chạy skill `self-review` (checklist sau design), rồi spawn `reviewer` kiểm chéo so với
`requirements.md` — chỉ `PASS` mới coi là xong. Cập nhật `.sdlc/state.md` theo schema.

Đây là phase con của `/sdlc:run`; dùng khi muốn chạy/rà lại riêng phase design.
