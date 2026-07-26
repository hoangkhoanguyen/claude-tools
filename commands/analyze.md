---
description: Chạy riêng phase analyze cho một sprint — phân tích tài liệu business logic thành requirements (user stories, AC, business rules, data entities, edge cases).
argument-hint: <sprint-slug>
---

# /sdlc:analyze

Chạy riêng phase phân tích requirements cho sprint `$1` (nếu trống, lấy từ `.sdlc/state.md`).

Spawn subagent `product-analyst`, dùng skill `requirements-analysis`. Ghi kết quả vào
`.sdlc/<sprint>/requirements.md` với 2 tầng: Human Review (đầu file) + Agent Reference.

Kết thúc: chạy skill `self-review` (checklist sau analyze). Nếu có Open Questions không tự resolve an
toàn được, hỏi user. Cập nhật `.sdlc/state.md`.

Đây là phase con của `/sdlc:run`; dùng lệnh này khi muốn chạy/rà lại riêng phase analyze.
