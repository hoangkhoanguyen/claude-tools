---
description: Chạy riêng phase design cho một sprint — từ requirements tạo architecture, data model, API contracts, UI flow và bảng ánh xạ rule/edge case.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:design

Chạy riêng phase thiết kế cho sprint `$2` thuộc version `$1`
(nếu trống, lấy từ `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

Yêu cầu `.sdlc/<version>/<sprint>/requirements.md` đã tồn tại (chạy `/sdlc:analyze` trước nếu chưa).

**Nạp context trước (nguyên tắc 0):** đọc `.sdlc/<version>/context.md` — khớp fingerprint thì dùng luôn,
lệch/thiếu thì chưng cất lại theo `templates/context.template.md`. Đọc `.sdlc/architecture.md`.
Truyền **đường dẫn** `context.md` cho cả 2 nhánh agent; agent KHÔNG tự Glob repo tìm `CLAUDE.md`.

Chạy 2 nhánh (song song nếu độc lập):

**Nhánh hệ thống** — spawn `architect`, dùng skill `system-design`. Đọc codebase (phạm vi sprint) +
`.sdlc/architecture.md` + `context.md`. Ghi `.sdlc/<version>/<sprint>/design.md` với 2 tầng +
bảng mapping phủ 100% RULE/EC/NFR + Regression-safe Plan. Heading phải theo dạng ổn định
`## <số>. <Tên mục>` / `### <định danh>` để `tasks.md` trỏ được tới từng đoạn. Cập nhật
`.sdlc/architecture.md` nếu đổi thành phần nền tảng.

**Nhánh giao diện** — spawn `ui-designer`, dùng skill `design-fidelity` + `artifact-design`.
ui-designer xét UI scope trong `requirements.md`, rồi chọn nguồn design theo từng màn hình:
- **Requirements KHÔNG có màn hình** → `design_ui: n/a`, bỏ nhánh này.
- **Requirements CÓ màn hình** → cần `ui-design.md` phủ đủ mọi màn/state. Từng màn:
  - Màn CÓ trong bản ngoài `.sdlc/<version>/<sprint>/ui-design.input.md` → ingest + chuẩn hóa.
  - Màn KHÔNG được cấp → tự sinh, ưu tiên nguồn: `.sdlc/design-system.md` → DESIGN.md →
    dự án CŨ: phong cách app hiện có → dự án MỚI không nguồn: hỏi user 1 lần.
  - CHỈ `waiting-external` khi user nói rõ sẽ cấp bản ngoài mà file chưa về.

Ghi `.sdlc/<version>/<sprint>/ui-design.md`; cập nhật `.sdlc/design-system.md`.

**Quan trọng — 2 nhánh độc lập:** nhánh hệ thống KHÔNG chờ UI design. Chỉ các phase SAU (Tasks
trở đi) mới cần `ui-design.md` hoàn chỉnh.

Kết thúc: chạy skill `self-review`, rồi spawn `reviewer` kiểm chéo `design.md` (và `ui-design.md`
nếu có) so với `requirements.md` — chỉ `PASS` mới coi là xong.
Cập nhật `.sdlc/<version>/state.md` theo schema.

Đây là phase con của `/sdlc:run`; dùng khi muốn chạy/rà lại riêng phase design.
