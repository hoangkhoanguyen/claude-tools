---
description: Chạy riêng phase analyze cho một sprint — phân tích tài liệu business logic thành requirements (user stories, AC, business rules, data entities, edge cases).
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:analyze

Chạy riêng phase phân tích requirements cho sprint `$2` thuộc version `$1`
(nếu trống, lấy từ `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

**KHÔNG tự đọc CLAUDE.md / business docs / architecture.md** — subagent tự nạp cold. Conversation chính
chỉ truyền path + version/sprint slug.

Spawn subagent `product-analyst`, dùng skill `requirements-analysis`. Nó tự Glob CLAUDE.md liên quan,
tự đọc business docs + `.sdlc/architecture.md`, tự chạy `self-review` trước khi trả về, ghi
`.sdlc/<version>/<sprint>/requirements.md` với 2 tầng: Human Review (đầu file) + Agent Reference
(gồm NFR và Regression Impact nếu là codebase có sẵn). Trả về block Human Review đã format sẵn để
conversation chính relay nguyên văn — không Read lại file để tóm tắt.

Kết thúc: spawn `reviewer` kiểm chéo so với tài liệu gốc (nó cũng tự đọc, không cần bạn đọc trước) —
`NEEDS_FIX` thì sửa rồi review lại. Nếu có Open Questions không tự resolve an toàn, hỏi user.
Cập nhật `.sdlc/<version>/state.md` theo schema.

Đây là phase con của `/sdlc:run`; dùng khi muốn chạy/rà lại riêng phase analyze.
