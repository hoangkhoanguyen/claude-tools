---
name: self-review
description: Checklist tự soi lại output sau mỗi phase SDLC — không cần user nhắc. Gồm review nội tại (output đủ tốt chưa) và cross-check với phase trước (có phủ đủ, có mâu thuẫn không). Dùng ở cuối mỗi phase trước khi ghi file hoặc báo xong.
---

# Self-Review

Kỹ năng tự nhìn lại việc mình vừa làm TRƯỚC khi coi là xong — áp dụng ở cuối mỗi phase, không đợi user nhắc.
Triết lý: "làm xong" ≠ "đạt". Luôn tự kiểm tra và tự sửa trước khi bàn giao sang bước sau.

## Hai lớp review

**Lớp 1 — Review nội tại (output của chính phase này đủ tốt chưa?)**
- Output có đủ thông tin để phase KẾ TIẾP làm việc mà không phải đoán không?
- Có phần nào mơ hồ, thiếu, hoặc tự mâu thuẫn không?
- Có nội dung bịa/thừa ngoài đầu vào không? → cắt.

**Lớp 2 — Cross-check với phase trước (có nhất quán & phủ đủ không?)**
- Mọi artifact của phase trước đã được phản ánh chưa? (rule → design, AC → task, AC/EC → test)
- Có mâu thuẫn với quyết định/ràng buộc đã chốt ở phase trước không?
- Có gì trong phase trước bị bỏ quên không?

## Checklist theo từng phase

**Sau analyze:** architect đọc có đủ thiết kế không? mọi story có AC testable? mọi rule có EC? NFR đã ghi?
Regression Impact đã liệt kê (nếu codebase có sẵn)? có bịa gì không?

**Sau design:** mọi RULE-xx / EC-xx / NFR-xx có trong bảng mapping? module cũ có Regression-safe Plan?
ăn khớp codebase + architecture.md + CLAUDE.md? có endpoint/entity thừa?
Nếu có UI: mọi màn hình/state có spec + Design AC? giá trị thị giác qua token, không hardcode? không bịa
phong cách ngoài DESIGN.md?

**Sau tasks:** mọi AC/EC có ≥1 task phụ trách? phụ thuộc & song song đúng? mỗi task có tiêu chí test?

**Sau mỗi task (execute):** đủ EC liên quan? còn TODO/hardcode/debug? test đã chạy pass thật? có phá vỡ vùng liên quan?

**Sau test:** mọi AC/EC/NFR (+ DAC nếu có UI) có test hoặc liệt kê verify-tay? test chạy xanh thật? visual verification đã chạy? phần "verify tay" có thật sự không tự động được?

**Cuối sprint (qa-guard):** đã thực sự chạy full test + happy path + regression happy path feature cũ? NFR đạt thật? design fidelity đạt (nếu có UI)? report tách rõ "đã cover" vs "cần verify tay"?

## Reviewer độc lập (bổ sung cho self-review)

Self-review là tự-chấm nên có điểm mù. Sau analyze và design, ngoài self-review còn spawn agent `reviewer`
(read-only) kiểm chéo output so với đầu vào. Chỉ khi reviewer trả `PASS` mới sang phase sau.

## Quy tắc

Nếu bất kỳ mục nào FAIL → SỬA ngay rồi review lại, KHÔNG ghi file / báo xong với lỗi đã biết. Chỉ khi
mọi mục pass mới chuyển sang phase sau.
