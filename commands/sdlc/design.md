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

**Nhánh giao diện** — spawn `ui-designer`, dùng skill `design-fidelity` + `artifact-design`. ui-designer xét
**UI scope trong `requirements.md`** (KHÔNG theo file có sẵn), rồi chọn nguồn design **theo từng màn hình**:
- **Requirements KHÔNG có màn hình** → `design_ui: n/a`, bỏ nhánh này.
- **Requirements CÓ màn hình** → cần `ui-design.md` phủ đủ mọi màn/state. Từng màn:
  - Màn CÓ trong bản ngoài `.sdlc/<sprint>/ui-design.input.md` (từ Claude Design / designer — input của họ có
    thể lấy từ `requirements.md` hoặc ý tưởng riêng) → **ingest + chuẩn hóa**.
  - Màn KHÔNG được bản ngoài cấp → **tự sinh**, ưu tiên nguồn: tokens của phần external đã ingest (đồng bộ
    thị giác) → DESIGN.md / design system → **dự án CŨ: phong cách app hiện có** → **dự án MỚI không nguồn
    nào: hỏi user**. Bên ngoài cấp bao nhiêu dùng bấy nhiêu, phần thiếu workflow tự xử — không chờ.
  - **Không có DESIGN.md khi phải tự sinh** — phân biệt cũ/mới:
    - **Dự án cũ** (đã có UI chạy được) → BẮT BUỘC bám phong cách app hiện có, KHÔNG hỏi phong cách, không
      đổi style — UI mới phải liền mạch với phần cũ.
    - **Dự án mới** (chưa có UI) → hỏi user MỘT LẦN: (a) có DESIGN.md không? (b) mô tả phong cách (tone / màu
      chủ đạo / app tham chiếu) (c) để Claude tự quyết. Với (b)/(c) → **sinh `DESIGN.md` ở gốc repo** làm
      nguồn thẩm mỹ chính thức xuyên sprint, rồi sinh spec.
  - Ghi `ui_design_source: external | mixed | internal`; mỗi màn đánh dấu `[external]`/`[generated]`.
  - CHỈ `waiting-external` (+ blocker trỏ file input) khi user nói rõ SẼ cấp bản ngoài mà file chưa về.

Ghi `.sdlc/<sprint>/ui-design.md` (tokens, component spec, Design AC, state, responsive, dark/light); cập nhật
`.sdlc/design-system.md`.

**Quan trọng — 2 nhánh độc lập:** nhánh hệ thống (architect) chỉ cần `requirements.md`, KHÔNG chờ UI design.
Nó cứ chạy tới `done` bình thường kể cả khi nhánh UI đang `waiting-external`. Chỉ các phase SAU (Tasks trở đi)
mới cần `ui-design.md` hoàn chỉnh.

Kết thúc: chạy skill `self-review`, rồi spawn `reviewer` kiểm chéo `design.md` (và `ui-design.md` nếu có)
so với `requirements.md` — chỉ `PASS` mới coi là xong. Cập nhật `.sdlc/state.md` theo schema.

Đây là phase con của `/sdlc:run`; dùng khi muốn chạy/rà lại riêng phase design.
