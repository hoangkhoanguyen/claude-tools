---
description: Chạy riêng phase test cho một sprint — tự phát hiện cách test theo stack (unit, API, Playwright UI, 3rd party sandbox), viết + chạy test, rồi QA gate để bàn giao sạch.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:test

Chạy riêng phase test + QA gate cho sprint `$2` thuộc version `$1`
(nếu trống, lấy từ `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

**Nạp context trước (nguyên tắc 0):** Glob toàn repo liệt kê mọi `CLAUDE.md`; đọc file gốc + các
`CLAUDE.md` liên quan. Đọc `.sdlc/architecture.md`. Nắm lệnh test, convention của dự án.

## Test
Spawn subagent `test-strategist`, dùng skill `test-strategy`. Tự phát hiện stack & công cụ, chọn cách
test theo loại feature (unit / API / Playwright UI / 3rd party sandbox / mock webhook). Nếu có UI design →
thêm visual verification (skill `design-fidelity`): screenshot đối chiếu Design AC + baseline trong
`.sdlc/<version>/<sprint>/visual-baseline/`. Viết test và CHẠY thật đến khi xanh.
Mọi AC/EC/NFR/DAC phải có test hoặc được liệt kê verify-tay.
Ghi `.sdlc/<version>/<sprint>/test-report.md`.

**Nó tự đóng vòng fix (tối đa 3 vòng) và tự commit test file + fix.** Bạn KHÔNG điều phối vòng fix,
KHÔNG chạm git index khi nó đang chạy. Nó trả status ở dòng đầu: `DONE` → sang QA gate; `BLOCKED` →
dừng, báo user; `DESIGN_GAP` → vá design nếu nhỏ & rõ, không thì đề nghị `/sdlc:replan`, rồi spawn lại;
`NEEDS_SERVICE` → hỏi user bật service kèm lệnh gợi ý, đợi "ok", spawn lại; `CONTEXT_LIMIT` → spawn
agent mới tiếp tục. Relay tóm tắt ngắn cho user.

## QA Gate
Spawn subagent `qa-guard`: chạy full test + happy path từng story + regression happy path feature cũ liên
quan + NFR check + design fidelity check (nếu có UI) + quét hardcode/TODO/unhandled error.
**Cũng tự đóng vòng fix (tối đa 3 vòng, mỗi vòng chạy lại checklist từ đầu) và tự commit** — bạn chỉ
nhận status, không tự fix, không chạm git. Chỉ khi status `DONE` mới trình bày Pre-manual Report:
- Đã tự động cover (không cần user kiểm)
- Cần user verify tay (chỉ nghiệp vụ)
- Edge case chưa define (nếu có)

Kết thúc: chạy skill `self-review`. Cập nhật `.sdlc/<version>/state.md`.
