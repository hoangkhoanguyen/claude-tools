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

## Model — nhắc user một lần, ở đây

Đây là điểm vào đầu tiên của plugin, nên nhắc user **một lần duy nhất** rồi thôi: session chạy `/sdlc:*`
nên để **Opus** (`/model opus`), vì nó giữ mọi quyết định và approval gate suốt cả sprint — **và vì các
agent phase 1-3 (`product-analyst`, `architect`, `ui-designer`, `reviewer`) khai `model: inherit`, tức
chúng chạy đúng model của session này.** Để session ở Sonnet thì cả 3 phase đầu cũng chạy Sonnet.

Phase 4-6 không bị ảnh hưởng: chúng ghim cứng `sonnet` để hạ model bất kể session chính chạy gì. Nên
**không cần cấu hình gì thêm** ngoài việc chọn model cho session.

Nhắc xong thì chạy tiếp bình thường — đừng dừng lại chờ user đổi model, và đừng nhắc lại ở các lệnh sau.

## Các bước

1. **Delegate đọc tài liệu cho subagent (KHÔNG tự Read).** Business docs của user thường dài
   (BRD/PRD/SRS 20-50 trang) và cả team CLAUDE.md có thể 5-10 file — nếu conversation chính tự đọc,
   context này còn phải sống suốt cả version. Spawn subagent `product-analyst` với nhiệm vụ đặc biệt
   "sprint decomposition": truyền path business docs + version slug. Nó tự Glob CLAUDE.md, tự đọc
   `.sdlc/architecture.md` (nếu có), tự đọc business docs, và trả về **bảng sprint đề xuất** (slug,
   goal 1-2 dòng, features, dependencies, tech stack suggestion) + block Human Review sẵn để relay.
   Conversation chính chỉ nhận bảng cô đọng — không giữ raw docs.

2. **Nhận bảng sprint từ subagent.** Mỗi sprint là một khối feature khép kín, có thể deliver độc lập.
   Nếu bảng nó trả có vấn đề về phụ thuộc/thứ tự, feedback lại cho nó chỉnh — đừng tự sửa bằng cách
   đọc lại docs.

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
