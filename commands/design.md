---
description: Chạy riêng phase design cho một sprint — từ requirements tạo architecture, data model, API contracts, UI flow và bảng ánh xạ rule/edge case.
argument-hint: <sprint-slug>
---

# /sdlc:design

Chạy riêng phase thiết kế cho sprint `$1` (nếu trống, lấy từ `.sdlc/state.md`).

Yêu cầu `requirements.md` của sprint đã tồn tại (chạy `/sdlc:analyze` trước nếu chưa).

Chạy 2 nhánh (song song nếu độc lập):

**Nhánh hệ thống** — spawn `architect`, dùng skill `system-design`. Đọc codebase + `.sdlc/architecture.md` +
CLAUDE.md liên quan. Ghi `.sdlc/<sprint>/design.md` với 2 tầng + bảng mapping phủ 100% RULE/EC/NFR +
Regression-safe Plan. Cập nhật `.sdlc/architecture.md` nếu đổi thành phần nền tảng.

**Nhánh giao diện** (CHỈ khi dự án có DESIGN.md / design system) — spawn `ui-designer`, dùng skill
`design-fidelity` + `artifact-design`. Ghi `.sdlc/<sprint>/ui-design.md` (tokens, component spec, Design AC,
state, responsive, dark/light). Cập nhật `.sdlc/design-system.md`. Nếu dự án KHÔNG có định hướng thẩm mỹ →
bỏ nhánh này, UI bám convention codebase.

Kết thúc: chạy skill `self-review`, rồi spawn `reviewer` kiểm chéo `design.md` (và `ui-design.md` nếu có)
so với `requirements.md` — chỉ `PASS` mới coi là xong. Cập nhật `.sdlc/state.md` theo schema.

Đây là phase con của `/sdlc:run`; dùng khi muốn chạy/rà lại riêng phase design.
