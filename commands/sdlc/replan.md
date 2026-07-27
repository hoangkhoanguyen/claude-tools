---
description: Cập nhật lại danh sách sprint trong một version khi tài liệu business logic thay đổi, mà KHÔNG mất state của các sprint đã/đang làm. Dùng khi phát sinh feature mới, đổi ưu tiên, hoặc gộp/tách sprint giữa dự án.
argument-hint: <version-slug> [đường dẫn tài liệu business logic mới/đã cập nhật]
---

# /sdlc:replan

Điều chỉnh kế hoạch sprint trong một version khi business logic đổi giữa chừng, bảo toàn công việc đã làm.

> Dùng lệnh này khi thay đổi xảy ra **trong phạm vi version hiện tại** (thêm/sửa/bỏ feature nhỏ,
> đổi ưu tiên sprint). Nếu là đợt phát triển lớn hoàn toàn mới → dùng `/sdlc:sprint-plan <version-mới>`.

## Đầu vào

- `$1`: version slug cần replan (vd `v1`). Nếu trống, lấy version đang active từ `.sdlc/versions.md`.
- `$2`: tài liệu business logic mới/đã cập nhật. Nếu trống, dùng tài liệu gốc + hỏi user điểm thay đổi.

## Các bước

1. **Đọc state hiện tại**: `.sdlc/versions.md` + `.sdlc/<version>/sprints.md` +
   `.sdlc/<version>/state.md` + các thư mục `.sdlc/<version>/<sprint>/` đã có.
   Đọc `.sdlc/<version>/context.md` (nguyên tắc 0) — khớp fingerprint thì dùng luôn, lệch/thiếu thì
   chưng cất lại theo `templates/context.template.md`.

2. **Diff nghiệp vụ**: so tài liệu mới với sprint hiện có trong version này. Phân loại thay đổi:
   - Feature MỚI chưa có sprint → tạo sprint mới (status `planned`). **Slug phải tiếp nối số thứ tự
     của sprint cuối cùng trong `.sdlc/<version>/sprints.md`** (kể cả sprint đã `cancelled`), KHÔNG
     đánh số lại từ 1. Ví dụ: hiện có `sprint-1-auth` đến `sprint-3-reports` thì sprint mới bắt đầu
     từ `sprint-4-...`. Điều này đảm bảo slug luôn unique trong version và folder không bị ghi đè.
   - Feature ĐỔI thuộc sprint CHƯA làm (`planned`) → cập nhật mô tả sprint đó.
   - Feature ĐỔI thuộc sprint ĐÃ done/đang làm → KHÔNG sửa đè. Tạo sprint "change request" mới tham
     chiếu sprint gốc, để xử lý như một thay đổi có kiểm soát (giữ lịch sử + tránh phá state cũ).
   - Feature BỎ → đánh dấu sprint/feature là `cancelled`, không xóa (giữ vết).

3. **Cập nhật `.sdlc/<version>/sprints.md`** theo phân loại trên, giữ nguyên trạng thái các sprint
   đã done/đang làm. Cập nhật dependency nếu thứ tự đổi.

4. **KHÔNG đụng** vào `.sdlc/<version>/<sprint>/` của sprint đã done/đang làm, trừ khi user yêu cầu rõ.

4a. **Nếu có sửa `design.md` của một sprint chưa done** → khoảng dòng trong `Design ref` của `tasks.md`
   sprint đó đã lệch. `Grep -n '^#{2,3} ' design.md` lấy lại dòng heading và cập nhật `Design ref`.
   Bỏ qua bước này sẽ khiến feature-builder phải Grep sửa lại từng lần — vẫn chạy đúng, nhưng tốn thêm.

5. **Self-review** (skill self-review): mọi feature trong tài liệu mới đều có sprint phụ trách?
   Thứ tự tôn trọng dependency? Không sprint đang-làm nào bị phá state?

## Trình bày

Tóm tắt: sprint nào thêm/đổi/hủy trong version `<version>`, sprint nào giữ nguyên. Mời user chốt.
Nhắc: `/sdlc:run <version> <slug>` cho sprint mới; sprint đang dở vẫn resume bình thường.
