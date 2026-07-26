---
name: requirements-analysis
description: Chuẩn cấu trúc và chất lượng cho output của phase analyze trong SDLC — user stories, acceptance criteria testable, business rules, data entities, edge cases. Dùng khi phân tích tài liệu business logic của một sprint thành requirements để agent design và task-breakdown làm đúng.
---

# Requirements Analysis

Kỹ năng biến tài liệu business logic (do user cung cấp) của MỘT sprint thành requirements có cấu trúc.
Mục tiêu: user chỉ cần review vài section đầu, phần còn lại đủ tường minh để downstream agent không đoán mò.

## Bố cục 2 tầng

**PHẦN 1 — Human Review (đưa lên đầu file):**
1. Sprint Goal & Scope (✅ in scope / ❌ out of scope)
2. Open Questions (điểm mơ hồ cần user quyết)
3. Key Assumptions (quyết định tự đưa ra, user override được)

**PHẦN 2 — Agent Reference (chi tiết):**
4. User Stories + AC
5. Business Rules
6. Data Entities & Constraints
7. Edge Cases Registry
8. Integration Touchpoints
9. Non-functional Requirements (NFR-xx): performance / security / a11y / i18n — chỉ cái liên quan sprint
10. Regression Impact (chỉ khi thêm vào codebase có sẵn): feature/module cũ có thể bị ảnh hưởng
11. Definition of Done (gồm NFR + không regression)

## Quy tắc chất lượng

- **AC phải testable**: dùng `GIVEN <trạng thái> WHEN <hành động> THEN <kết quả>`. Không viết AC dạng
  chung chung ("hoạt động tốt", "nhanh").
- **Business Rule tường minh, đánh số** (`RULE-01`), không viết prose. Bao gồm điều kiện, công thức, constraint.
- **Edge case gắn với rule/story** (`EC-01 [RULE-03]: ... → ...`) để developer và test không bỏ sót.
- **Không bịa** requirement ngoài tài liệu nguồn. Mơ hồ → Open Questions hoặc Key Assumptions.
- **Bám scope sprint**, không phân tích toàn dự án.

## Vì sao cấu trúc này giảm sai sót downstream

```
Business Rules + Edge Cases tường minh → architect thiết kế đúng validation/error handling
Out of scope rõ ràng                   → không over-design, không build nhầm
AC dạng GIVEN/WHEN/THEN                 → test-strategist & qa-guard verify tự động được
Open Questions resolve trước Design    → execute không bị block giữa chừng
Assumptions ghi lại                     → user catch được nếu tự-suy sai
```

## Checklist tự soi trước khi chốt

- [ ] Architect đọc file này có đủ để thiết kế không cần đoán?
- [ ] Mọi story có AC testable? Mọi rule có edge case liên quan?
- [ ] Có requirement nào bịa ngoài nguồn? (xóa)
- [ ] Open Question nào tự resolve an toàn được? (chuyển sang Assumptions)
