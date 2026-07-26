---
description: Cập nhật lại danh sách sprint khi tài liệu business logic thay đổi, mà KHÔNG mất state của các sprint đã/đang làm. Dùng khi phát sinh feature mới, đổi ưu tiên, hoặc gộp/tách sprint giữa dự án.
argument-hint: [đường dẫn tài liệu business logic mới/đã cập nhật]
---

# /sdlc:replan

Điều chỉnh kế hoạch sprint khi business logic đổi giữa chừng, bảo toàn công việc đã làm.

## Đầu vào
Tài liệu business logic mới/đã cập nhật: `$1` (nếu trống, dùng tài liệu gốc + hỏi user điểm thay đổi).

## Các bước

1. **Đọc state hiện tại**: `.sdlc/sprints.md` + `.sdlc/state.md` + các thư mục `.sdlc/<sprint>/` đã có.
   Đọc CLAUDE.md liên quan (nguyên tắc 0).

2. **Diff nghiệp vụ**: so tài liệu mới với sprint hiện có. Phân loại thay đổi:
   - Feature MỚI chưa có sprint → tạo sprint mới (status `planned`).
   - Feature ĐỔI thuộc sprint CHƯA làm (`planned`) → cập nhật mô tả sprint đó.
   - Feature ĐỔI thuộc sprint ĐÃ done/đang làm → KHÔNG sửa đè. Tạo sprint "change request" mới tham
     chiếu sprint gốc, để xử lý như một thay đổi có kiểm soát (giữ lịch sử + tránh phá state cũ).
   - Feature BỎ → đánh dấu sprint/feature là `cancelled`, không xóa (giữ vết).

3. **Cập nhật `.sdlc/sprints.md`** theo phân loại trên, giữ nguyên trạng thái các sprint đã done/đang làm.
   Cập nhật dependency nếu thứ tự đổi.

4. **KHÔNG đụng** vào `.sdlc/<sprint>/` của sprint đã done/đang làm, trừ khi user yêu cầu rõ.

5. **Self-review** (skill self-review): mọi feature trong tài liệu mới đều có sprint phụ trách? thứ tự
   tôn trọng dependency? không sprint đang-làm nào bị phá state?

## Trình bày
Tóm tắt cho user: sprint nào thêm/đổi/hủy, sprint nào giữ nguyên. Mời user chốt. Nhắc: `/sdlc:run <slug>`
cho sprint mới; sprint đang dở vẫn resume bình thường.
