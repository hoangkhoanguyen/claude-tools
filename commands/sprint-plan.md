---
description: Đọc tài liệu business logic của dự án và chia thành các sprint. Người dùng review danh sách sprint và chốt tech stack mỗi sprint. Chạy MỘT LẦN ở đầu dự án.
argument-hint: [đường dẫn tới tài liệu business logic]
---

# /sdlc:sprint-plan

Chia dự án thành các sprint từ tài liệu business logic. Đây là bước đầu tiên, chạy trước mọi thứ.

## Đầu vào

Tài liệu business logic: `$1` (nếu trống, hỏi user chỉ đường dẫn / dán nội dung).
Plugin KHÔNG tự sinh tài liệu này — nó là đầu vào do user cung cấp.

## Các bước

1. **Đọc toàn bộ** tài liệu business logic. Nếu có codebase sẵn, Grep/Glob để hiểu hiện trạng.

2. **Nhóm feature thành sprint.** Mỗi sprint là một khối feature khép kín, có thể deliver độc lập.
   Cân nhắc phụ thuộc giữa các feature để xếp thứ tự sprint hợp lý (nền tảng trước, tính năng phụ thuộc sau).

3. **Ghi `.sdlc/sprints.md`** với, cho mỗi sprint:
   - Slug ngắn (dùng làm tên thư mục, vd `sprint-1-auth`)
   - Tên & mô tả 1-2 dòng (deliver gì)
   - Feature chính nằm trong sprint
   - Phụ thuộc vào sprint nào
   - Tech stack đề xuất (để user chốt) — nếu dự án đã có stack thì kế thừa
   - Trạng thái: `planned`

4. **Khởi tạo `.sdlc/state.md`** theo schema `templates/state.template.md`: chưa bắt đầu sprint nào.

4b. **Khởi tạo `.sdlc/architecture.md`** (foundational, xuyên sprint): ghi các quyết định nền tảng dùng
   chung nhiều sprint — stack tổng thể, cấu trúc thư mục, cơ chế auth, mô hình dữ liệu lõi, convention chung.
   Với dự án có sẵn: mô tả kiến trúc HIỆN CÓ (đọc từ codebase) để các sprint sau bám theo, không phá vỡ.
   File này là nguồn tham chiếu cho `architect` ở mọi sprint; architect cập nhật nó khi thêm thành phần nền tảng mới.

5. **Trình bày danh sách sprint cho user** ở mức cao (không đi vào user story chi tiết — đó là việc của
   phase analyze sau này). Mời user: reorder, gộp/tách sprint, chốt tech stack.

## Self-review trước khi trình bày (dùng skill self-review)

- Mọi feature trong tài liệu có nằm trong ít nhất một sprint không? (không sót)
- Thứ tự sprint có tôn trọng phụ thuộc không?
- Sprint có đủ nhỏ để review nhẹ, nhưng đủ lớn để deliver có nghĩa không?

## Sau khi user chốt

Cập nhật `.sdlc/sprints.md` theo chỉnh sửa của user. Hướng dẫn: chạy `/sdlc:run <sprint-slug>` để bắt đầu.
