---
description: Chạy riêng phase test cho một sprint — tự phát hiện cách test theo stack (unit, API, Playwright UI, 3rd party sandbox), viết + chạy test, rồi QA gate để bàn giao sạch.
argument-hint: <sprint-slug>
---

# /sdlc:test

Chạy riêng phase test + QA gate cho sprint `$1` (nếu trống, lấy từ `.sdlc/state.md`).

## Test
Spawn subagent `test-strategist`, dùng skill `test-strategy`. Tự phát hiện stack & công cụ, chọn cách
test theo loại feature (unit / API / Playwright UI / 3rd party sandbox / mock webhook). Viết test và
CHẠY thật đến khi xanh. Mọi AC/EC phải có test hoặc được liệt kê verify-tay. Ghi `.sdlc/<sprint>/test-report.md`.

Nếu cần app/service chạy để test → yêu cầu user bật (như pre-flight), đợi xác nhận.

## QA Gate
Spawn subagent `qa-guard`: chạy full test + happy path từng story + regression happy path feature cũ liên
quan + NFR check + quét hardcode/TODO/unhandled error. Chỉ khi sạch mới trình bày Pre-manual Report:
- Đã tự động cover (không cần user kiểm)
- Cần user verify tay (chỉ nghiệp vụ)
- Edge case chưa define (nếu có)

Kết thúc: chạy skill `self-review`. Cập nhật `.sdlc/state.md`.
