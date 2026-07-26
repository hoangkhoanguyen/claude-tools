---
description: Chạy riêng phase analyze cho một sprint — phân tích tài liệu business logic thành requirements (user stories, AC, business rules, data entities, edge cases).
argument-hint: <sprint-slug>
---

# /sdlc:analyze

Chạy riêng phase phân tích requirements cho sprint `$1` (nếu trống, lấy từ `.sdlc/state.md`).

Nạp context trước (nguyên tắc 0): đọc CLAUDE.md liên quan + tài liệu business logic gốc.

Spawn subagent `product-analyst`, dùng skill `requirements-analysis`. Ghi kết quả vào
`.sdlc/<sprint>/requirements.md` với 2 tầng: Human Review (đầu file) + Agent Reference (gồm NFR và
Regression Impact nếu là codebase có sẵn).

Kết thúc: chạy skill `self-review` (checklist sau analyze), rồi spawn `reviewer` kiểm chéo so với tài liệu
gốc — `NEEDS_FIX` thì sửa rồi review lại. Nếu có Open Questions không tự resolve an toàn được, hỏi user.
Cập nhật `.sdlc/state.md` theo schema.

Đây là phase con của `/sdlc:run`; dùng lệnh này khi muốn chạy/rà lại riêng phase analyze.
