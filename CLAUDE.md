# SDLC Workflow Plugin — Hướng dẫn cho Claude

Đây là plugin điều phối vòng đời phát triển phần mềm theo sprint. Khi plugin này active,
bạn áp dụng các nguyên tắc dưới đây cho MỌI command `/sdlc:*`.

## Nguyên tắc cốt lõi (áp dụng xuyên suốt)

1. **Đầu vào là tài liệu business logic có sẵn của user.** Plugin KHÔNG tự sinh ra tài liệu
   business logic — user cung cấp (file, đường dẫn, hoặc chỉ chỗ). Nhiệm vụ của bạn bắt đầu
   từ việc chia sprint trở đi.

2. **Sprint-first.** Với dự án lớn: chia sprint TRƯỚC, rồi mới analyze/design/tasks cho TỪNG
   sprint. Không bao giờ analyze toàn bộ dự án cùng lúc — user sẽ quá tải khi review.

3. **Review 2 tầng.** Mọi output có phần đầu "Human Review" (ngắn, đưa lên đầu file) và phần
   sau "Agent Reference" (chi tiết, cho downstream agent đọc). User thường chỉ đọc phần đầu.
   Vì vậy phần sau PHẢI đủ tường minh để agent kế tiếp không phải đoán mò.

4. **State-driven & resume-được.** Trước khi làm bất cứ gì trong `/sdlc:run`, ĐỌC `.sdlc/state.md`
   để biết đang ở đâu. Sau MỖI đơn vị công việc (mỗi task, mỗi phase), CẬP NHẬT state ngay.
   Nếu bị ngắt, lần chạy sau phải tiếp tục đúng chỗ — không làm lại việc đã done.

5. **Tự soi lại (self-review) — không cần user nhắc.** Sau mỗi phase, tự chạy checklist trong
   skill `self-review`. Không coi "làm xong = đạt". Luôn hỏi: "output này có đủ cho bước sau
   không? có mâu thuẫn với phase trước không?". Thiếu thì bổ sung TRƯỚC khi ghi file / báo xong.

6. **Bàn giao sạch.** Mục tiêu cuối: khi user manual test, họ CHỈ verify nghiệp vụ, KHÔNG gặp
   lỗi vặt (validation, API 500, empty state, crash...). Mọi thứ tự động hóa được thì phải được
   test tự động trước khi báo xong.

## Tận dụng built-in của Claude (bắt buộc ưu tiên)

- **TodoWrite**: dùng để track task trong session khi execute; đồng bộ ra `.sdlc/<sprint>/tasks.md`
  để persist qua session.
- **Subagents (Agent tool)**: mỗi phase nên spawn agent chuyên biệt tương ứng
  (product-analyst, architect, feature-builder, test-strategist, qa-guard). Chạy song song khi
  các phần độc lập.
- **Bash**: ping port để phát hiện service đang chạy; chạy test runner; smoke test API bằng curl.
- **Playwright** (đã cài sẵn trong môi trường): tự động hóa test UI. KHÔNG chạy `playwright install`.
- **Skills**: load skill phù hợp theo phase (đã kèm trong plugin này).
- **Hooks**: dùng cho auto-checkpoint / format sau khi ghi file (xem `hooks/`).

## Pre-flight trước khi execute (RẤT QUAN TRỌNG)

Trước khi viết dòng code đầu tiên trong execute:
1. Đọc design + tech stack → liệt kê mọi service/tool bên ngoài cần chạy (DB, cache, dev server,
   3rd party sandbox...).
2. Tự `ping`/check port xem cái nào đã chạy.
3. CHỈ hỏi user bật những cái còn thiếu, kèm lệnh gợi ý để bật.
4. Đợi user xác nhận ("ok"/"xong") RỒI mới tiếp tục. Không tự giả định service đã sẵn sàng.

## Chọn chiến lược test (tự phát hiện)

Xem skill `test-strategy`. Nguyên tắc: tự động hóa tối đa. Chỉ flag "cần user verify tay" khi
thực sự không thể tự động (OTP SMS thật, Face ID, thanh toán tiền thật...).

## Khi nào hỏi user

- Danh sách sprint sau `sprint-plan` (để user reorder/chốt tech stack).
- Open Questions trong analyze mà bạn không thể tự resolve an toàn.
- Pre-flight: yêu cầu bật service ngoài.
- Ngoài các điểm trên, trong `/sdlc:run` hãy chạy tự động hết mức có thể; báo cáo gọn sau mỗi
  phase và tiếp tục.
