---
name: system-design
description: Chuẩn cấu trúc và chất lượng cho output của phase design trong SDLC — architecture, data model/schema, API contracts, UI flow, và bảng ánh xạ business rule/edge case sang điểm xử lý. Dùng khi thiết kế hệ thống cho một sprint từ requirements.
---

# System Design

Kỹ năng thiết kế hệ thống cho MỘT sprint từ `requirements.md`, đủ chi tiết để feature-builder implement
mà không phải tự quyết kiến trúc.

## Trước khi thiết kế: đọc context

Grep/Glob codebase hiện có để nắm convention, stack, module sẵn có. Đọc `.sdlc/architecture.md`
(foundational, xuyên sprint) và các `CLAUDE.md` liên quan. Thiết kế phải ăn khớp — không áp kiến trúc lạ.
Với dự án thêm-feature-vào-codebase-sẵn-có, điều này tối quan trọng. Nếu sprint thêm/đổi thành phần nền
tảng dùng chung → cập nhật `.sdlc/architecture.md`.

## Bố cục 2 tầng

**PHẦN 1 — Human Review:**
1. Design Overview (quyết định kiến trúc chính + lý do)
2. Tech Decisions (lib/pattern mới thêm — user override được)
3. Risks / Trade-offs

**PHẦN 2 — Agent Reference:**
4. Architecture (component, trách nhiệm, tương tác)
5. Data Model (schema cụ thể: field, type, index, constraint, relationship)
6. API Contracts (method, path, request, response success + error, status, auth)
7. UI / Interaction Flow (màn hình, state, empty/loading/error)
8. **Rule & Edge-case Mapping** (bảng: mỗi RULE-xx / EC-xx / NFR-xx → xử lý ở đâu)
9. NFR Design (cách đáp ứng từng NFR-xx: index, authz, cache, rate limit...)
10. Regression-safe Plan (cách đổi module cũ mà không phá behavior — backward compatible)
11. File Change Plan (file tạo mới / sửa)

## Quy tắc then chốt: phủ 100% rule & edge case

Section 8 là bằng chứng thiết kế đã cover requirements. MỌI `RULE-xx`, `EC-xx` và `NFR-xx` phải xuất hiện
trong bảng, ánh xạ tới một điểm xử lý cụ thể (validation ở đâu, error response nào, state nào, index/authz
nào). Đây là chốt chặn quan trọng nhất để tránh lỗi vặt khi execute/test.

## API error phải được thiết kế, không để ngẫu nhiên

Mỗi endpoint khai báo rõ error response shape + status code cho các EC liên quan (400/401/403/404/409/422...).
Đây là lý do lớn khiến manual test không gặp "API lỗi bất ngờ".

## Checklist tự soi trước khi chốt

- [ ] Mọi RULE-xx có trong bảng mapping (section 8)?
- [ ] Mọi EC-xx có error handling tương ứng trong API/UI?
- [ ] Design ăn khớp convention/stack hiện có?
- [ ] Có endpoint/entity thừa (requirements không yêu cầu)? (cân nhắc bỏ)
