---
name: test-strategy
description: Bảng quyết định chọn cách test theo tech stack và loại feature — unit test, API test, Playwright UI automation, 3rd party sandbox, mock webhook. Dùng ở phase test trong SDLC để tự động hóa tối đa và chỉ để lại phần thực sự cần user verify tay.
---

# Test Strategy

Kỹ năng tự phát hiện cách test phù hợp và tự thực thi, để khi user manual test họ CHỈ verify nghiệp vụ,
KHÔNG gặp lỗi vặt.

## Nguyên tắc tối cao: tự động hóa tối đa

Chỉ đẩy sang "cần user verify tay" khi thực sự KHÔNG thể tự động (OTP SMS thật, Face ID, tiền thật,
xác nhận cảm quan UX). Mọi thứ khác phải được test tự động.

## Bảng quyết định theo loại feature

| Loại feature | Cách test | Công cụ |
|---|---|---|
| Logic thuần (util, tính toán, validation) | Unit test | test runner của stack (jest/vitest/pytest/go test...) |
| API endpoint | Gọi HTTP thật, assert status + shape + business rule | curl / supertest / requests |
| UI flow (không 3rd party) | Điều khiển browser: navigate/fill/click/assert | Playwright (đã cài sẵn) |
| Flow có 3rd party (OAuth, payment) | Browser + sandbox/test mode | Playwright + Stripe test keys / OAuth sandbox |
| Webhook / async | Trigger + mock callback + verify side effect | test runner + kiểm tra DB/state |
| UI có design (DESIGN.md/ui-design.md) | Visual verification: screenshot đối chiếu Design AC + baseline | Playwright + skill `design-fidelity` |
| Cần người thật (OTP SMS, Face ID, tiền thật) | Không tự động → liệt kê verify tay | — |

## Phối hợp môi trường

- Playwright đã cài sẵn trong môi trường Claude Code web. KHÔNG chạy `playwright install`.
  Nếu project pin version khác, launch với `executablePath: '/opt/pw-browsers/chromium'`.
- Cần app/service chạy để test → phối hợp với pre-flight của phase execute (yêu cầu user bật trước).

## Phủ requirements

Mỗi `AC-xx` (GIVEN/WHEN/THEN), `EC-xx` và `NFR-xx` phải có ≥1 test/kiểm tra, hoặc được liệt kê rõ là
verify-tay. Kèm bảng **AC/EC/NFR → test** trong report. NFR test tùy loại: performance (đo thời gian/tải),
security (thử truy cập trái phép, injection), a11y (kiểm tra role/label). Nếu có Regression Impact trong
requirements → thêm test/đi lại happy path của feature cũ bị ảnh hưởng.

## Chạy thật, không giả định

Viết test xong PHẢI chạy. Fail → fix → chạy lại đến khi xanh. Smoke test endpoint chính: không 500.

## Checklist tự soi trước khi chốt

- [ ] Mọi AC/EC có test hoặc được liệt kê verify-tay?
- [ ] Test đã CHẠY và xanh thật (không chỉ viết ra)?
- [ ] Phần đẩy sang "verify tay" có thật sự không tự động được không?
