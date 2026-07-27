---
description: Chạy riêng phase test cho một sprint — tự phát hiện cách test theo stack (unit, API, Playwright UI, 3rd party sandbox), viết + chạy test, rồi QA gate để bàn giao sạch.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:test

Chạy riêng phase test + QA gate cho sprint `$2` thuộc version `$1`
(nếu trống, lấy từ `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

**Nạp context trước (nguyên tắc 0):** đọc `.sdlc/<version>/context.md` — khớp fingerprint thì dùng luôn,
lệch/thiếu thì chưng cất lại theo `templates/context.template.md`. Lệnh test/lint/build lấy NGUYÊN VĂN từ
mục "Lệnh chuẩn của dự án". Truyền đường dẫn `context.md` khi spawn agent (agent KHÔNG tự Glob repo).

## Test
Spawn subagent `test-strategist`, dùng skill `test-strategy`. Tự phát hiện stack & công cụ, chọn cách
test theo loại feature (unit / API / Playwright UI / 3rd party sandbox / mock webhook). Nếu có UI design →
thêm visual verification (skill `design-fidelity`): screenshot đối chiếu Design AC + baseline trong
`.sdlc/<version>/<sprint>/visual-baseline/`. Viết test và CHẠY thật đến khi xanh.
Mọi AC/EC/NFR/DAC phải có test hoặc được liệt kê verify-tay.
Ghi `.sdlc/<version>/<sprint>/test-report.md`.

Nếu cần app/service chạy để test → yêu cầu user bật (như pre-flight), đợi xác nhận.

## QA Gate
Spawn subagent `qa-guard`: chạy full test + happy path từng story + regression happy path feature cũ liên
quan + NFR check + design fidelity check (nếu có UI) + quét hardcode/TODO/unhandled error. Chỉ khi sạch
mới trình bày Pre-manual Report:
- Đã tự động cover (không cần user kiểm)
- Cần user verify tay (chỉ nghiệp vụ)
- Edge case chưa define (nếu có)

Kết thúc: chạy skill `self-review`. Cập nhật `.sdlc/<version>/state.md`.
