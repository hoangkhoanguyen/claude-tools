---
description: Đọc tài liệu business logic và chia thành các sprint cho một version mới. Chạy lần đầu với v1; dùng lại khi bắt đầu đợt phát triển mới (v2, v3,...).
argument-hint: <version-slug> [đường dẫn tài liệu business logic]
---

# /sdlc:sprint-plan

Chia sprint từ tài liệu business logic cho **một version cụ thể**.

## Đầu vào

- `$1`: version slug — vd `v1`, `v2`, `phase-2`. Nếu trống, tự xác định:
  - Chưa có `.sdlc/versions.md` → đây là lần đầu, dùng `v1`.
  - Đã có → đọc version tiếp theo (v cuối + 1) và xác nhận với user.
- `$2`: tài liệu business logic (file / URL / paste). Nếu trống, hỏi user.

Plugin KHÔNG tự sinh tài liệu business logic — đây là đầu vào do user cung cấp.

## Các bước

1. **Nạp context & đọc tài liệu**: Glob toàn repo liệt kê mọi `CLAUDE.md`; đọc file gốc + các
   `CLAUDE.md` liên quan. Đọc `.sdlc/architecture.md` (nếu đã có từ version trước) để nắm nền tảng
   kế thừa. Nếu có codebase sẵn, Grep/Glob để hiểu hiện trạng. Đọc toàn bộ tài liệu business logic.

2. **Nhóm feature thành sprint.** Mỗi sprint là một khối feature khép kín, có thể deliver độc lập.
   Cân nhắc phụ thuộc giữa các feature để xếp thứ tự sprint hợp lý (nền tảng trước, tính năng phụ thuộc sau).

3. **Ghi `.sdlc/<version>/sprints.md`** với, cho mỗi sprint:
   - Slug ngắn, **bắt buộc theo pattern `sprint-<số>-<tên>`** (vd `sprint-1-auth`, `sprint-2-orders`).
     Số thứ tự bắt đầu lại từ 1 trong mỗi version — namespace version đã tách biệt, không lo trùng.
   - Tên & mô tả 1-2 dòng (deliver gì)
   - Feature chính nằm trong sprint
   - Phụ thuộc vào sprint nào (trong version này hoặc version trước)
   - Tech stack đề xuất (để user chốt) — nếu dự án đã có stack thì kế thừa
   - Trạng thái: `planned`

4. **Khởi tạo `.sdlc/<version>/state.md`** theo schema `templates/state.template.md`:
   đặt `version: <version-slug>`, chưa bắt đầu sprint nào.

5. **Cập nhật `.sdlc/versions.md`** (tạo nếu chưa có): thêm dòng version mới với trạng thái `planned`.
   File này là registry tất cả các version, giúp `/sdlc:status` và `/sdlc:run` xác định version active.

6. **Thiết lập gitignore** (chỉ lần đầu — khi chưa có `.sdlc/` hoặc chưa có dòng này):
   thêm vào `.gitignore` của dự án:
   ```
   .sdlc/*/*/visual-baseline/
   ```
   Toàn bộ `.sdlc/` còn lại được commit — đây là tài liệu sống của dự án, cả team theo dõi qua git.

7. **Khởi tạo/cập nhật `.sdlc/architecture.md`** (xuyên version, ở gốc `.sdlc/`):
   - Lần đầu (v1): ghi quyết định nền tảng — stack tổng thể, cấu trúc thư mục, cơ chế auth,
     mô hình dữ liệu lõi, convention chung. Với dự án có sẵn: mô tả kiến trúc HIỆN CÓ.
   - Version sau: chỉ bổ sung thay đổi nền tảng mới, không xóa lịch sử version trước.
   File này là nguồn tham chiếu cho `architect` ở mọi sprint mọi version.

8. **Phát hiện định hướng thiết kế thị giác.** Xác định dự án CŨ hay MỚI, nguồn thẩm mỹ sẵn có:
   - **Có DESIGN.md / design system** → khởi tạo/cập nhật `.sdlc/design-system.md` (xuyên version),
     trích design tokens. Nguồn tham chiếu cho ui-designer.
   - **Dự án CŨ, không DESIGN.md** → ghi chú: UI bám phong cách app hiện có. KHÔNG hỏi phong cách.
   - **Dự án MỚI, chưa có nguồn thẩm mỹ** → sprint đầu tiên có màn hình sẽ hỏi user 1 lần rồi sinh `DESIGN.md`.

9. **Trình bày danh sách sprint cho user** ở mức cao. Mời user: reorder, gộp/tách, chốt tech stack.

## Self-review trước khi trình bày (dùng skill self-review)

- Mọi feature trong tài liệu có nằm trong ít nhất một sprint không? (không sót)
- Thứ tự sprint có tôn trọng phụ thuộc không?
- Sprint có đủ nhỏ để review nhẹ, nhưng đủ lớn để deliver có nghĩa không?

## Sau khi user chốt

Cập nhật `.sdlc/<version>/sprints.md` theo chỉnh sửa của user.
Hướng dẫn: chạy `/sdlc:run <version> <sprint-slug>` để bắt đầu.
