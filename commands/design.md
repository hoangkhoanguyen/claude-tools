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

**Nhánh giao diện** (CHỈ khi dự án có UI) — spawn `ui-designer`, dùng skill `design-fidelity` + `artifact-design`.
Ghi `.sdlc/<sprint>/ui-design.md` (tokens, component spec, Design AC, state, responsive, dark/light). Cập nhật
`.sdlc/design-system.md`. Nhánh này có 2 mode (ui-designer tự phát hiện):
- **INTERNAL**: dự án có DESIGN.md / design system → ui-designer tự sinh spec. Ghi `ui_design_source: internal`.
- **EXTERNAL**: bản design được sinh ở NGOÀI (ví dụ Claude Design lấy `requirements.md` làm input) và drop vào
  `.sdlc/<sprint>/ui-design.input.md`. Nếu file input CHƯA có → set `design_ui: waiting-external` + blocker trỏ
  tới đường dẫn đó, báo user drop bản design vào rồi reply, KHÔNG tự chế thẩm mỹ. Khi có input → ui-designer
  ingest + chuẩn hóa thành `ui-design.md`. Ghi `ui_design_source: external`.

Nếu dự án KHÔNG có định hướng thẩm mỹ (không DESIGN.md, không bản ngoài) → bỏ nhánh này, UI bám convention codebase.

**Quan trọng — 2 nhánh độc lập:** nhánh hệ thống (architect) chỉ cần `requirements.md`, KHÔNG chờ UI design.
Nó cứ chạy tới `done` bình thường kể cả khi nhánh UI đang `waiting-external`. Chỉ các phase SAU (Tasks trở đi)
mới cần `ui-design.md` hoàn chỉnh.

Kết thúc: chạy skill `self-review`, rồi spawn `reviewer` kiểm chéo `design.md` (và `ui-design.md` nếu có)
so với `requirements.md` — chỉ `PASS` mới coi là xong. Cập nhật `.sdlc/state.md` theo schema.

Đây là phase con của `/sdlc:run`; dùng khi muốn chạy/rà lại riêng phase design.
