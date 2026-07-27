# SDLC Workflow Plugin — Hướng dẫn cho Claude

Đây là plugin điều phối vòng đời phát triển phần mềm theo sprint. Khi plugin này active,
bạn áp dụng các nguyên tắc dưới đây cho MỌI command `/sdlc:*`.

## Nguyên tắc cốt lõi (áp dụng xuyên suốt)

0. **LUÔN đọc context của dự án ở MỌI phase — trước khi làm bất cứ gì.** Đầu mỗi command/phase:
   - **Xác định các `CLAUDE.md` liên quan tới việc đang làm.** Một dự án có thể có NHIỀU `CLAUDE.md`
     (gốc + lồng trong từng module/package). Đừng đọc mù tất cả, cũng đừng chỉ đọc file gốc. Cách làm:
     1. Glob toàn repo để liệt kê mọi `CLAUDE.md` (và `AGENTS.md`/`.cursorrules` nếu có).
     2. TỰ ĐÁNH GIÁ file nào liên quan tới phạm vi phase/task hiện tại: luôn đọc file gốc (context chung);
        cộng thêm các `CLAUDE.md` nằm trong thư mục mà sprint/task này sẽ đụng tới (theo File Change Plan
        trong design). CLAUDE.md của module không liên quan thì bỏ qua.
     3. Quy tắc kế thừa: file lồng sâu hơn ghi đè/bổ sung file gốc cho phạm vi thư mục của nó — khi mâu
        thuẫn, file gần code hơn thắng.
   - Nắm convention, quy tắc, ràng buộc, lệnh build/test từ các file đã chọn. Tuân thủ tuyệt đối.
   - Phát hiện & tận dụng skill/command/agent sẵn có trong repo (xem nguyên tắc 7).
   Không bao giờ giả định convention — luôn xác nhận từ CLAUDE.md liên quan và codebase trước.

1. **Đầu vào là tài liệu business logic có sẵn của user.** Plugin KHÔNG tự sinh ra tài liệu
   business logic — user cung cấp (file, đường dẫn, hoặc chỉ chỗ). Nhiệm vụ của bạn bắt đầu
   từ việc chia sprint trở đi.

2. **Sprint-first.** Với dự án lớn: chia sprint TRƯỚC, rồi mới analyze/design/tasks cho TỪNG
   sprint. Không bao giờ analyze toàn bộ dự án cùng lúc — user sẽ quá tải khi review.

3. **Review 2 tầng.** Mọi output có phần đầu "Human Review" (ngắn, đưa lên đầu file) và phần
   sau "Agent Reference" (chi tiết, cho downstream agent đọc). User thường chỉ đọc phần đầu.
   Vì vậy phần sau PHẢI đủ tường minh để agent kế tiếp không phải đoán mò.

4. **State-driven & resume-được.** Trước khi làm bất cứ gì trong `/sdlc:run`, ĐỌC `.sdlc/<version>/state.md`
   để biết đang ở đâu. Sau MỖI đơn vị công việc (mỗi task, mỗi phase), CẬP NHẬT state ngay.
   Nếu bị ngắt, lần chạy sau phải tiếp tục đúng chỗ — không làm lại việc đã done.

4a. **Vị trí `.sdlc/` — luôn ở thư mục gốc repo.** Không đặt lồng trong sub-package hay app con.
    Cấu trúc: `.sdlc/versions.md`, `.sdlc/architecture.md`, `.sdlc/design-system.md` ở gốc (xuyên version);
    mọi thứ còn lại theo version: `.sdlc/<version>/state.md`, `.sdlc/<version>/<sprint>/`.
    Với monorepo nhiều app: vẫn một `.sdlc/` duy nhất ở gốc; slug sprint phản ánh app liên quan
    (vd `sprint-1-web-auth`, `sprint-2-api-orders`) để phân biệt.

4b. **`.sdlc/` luôn được commit lên git — cả team cùng thấy.** Khi khởi tạo lần đầu (`/sdlc:sprint-plan`),
    thêm vào `.gitignore` của dự án dòng sau để loại phần nặng/không cần thiết:
    ```
    .sdlc/*/*/visual-baseline/
    ```
    Còn lại (`versions.md`, `sprints.md`, `state.md`, `architecture.md`, `design-system.md`, mọi
    `requirements.md`, `design.md`, `ui-design.md`, `tasks.md`, `test-report.md`) đều commit — đây là
    tài liệu sống của dự án, team review được qua PR, lịch sử rõ ràng.

5. **Tự soi lại (self-review) — không cần user nhắc.** Sau mỗi phase, tự chạy checklist trong
   skill `self-review`. Không coi "làm xong = đạt". Luôn hỏi: "output này có đủ cho bước sau
   không? có mâu thuẫn với phase trước không?". Thiếu thì bổ sung TRƯỚC khi ghi file / báo xong.

6. **Bàn giao sạch.** Mục tiêu cuối: khi user manual test, họ CHỈ verify nghiệp vụ, KHÔNG gặp
   lỗi vặt (validation, API 500, empty state, crash...). Mọi thứ tự động hóa được thì phải được
   test tự động trước khi báo xong.

7. **Phát hiện & tận dụng skill sẵn có trong repo.** Trước khi tự làm theo cách mặc định, quét
   `.claude/skills`, `.claude/agents`, `.claude/commands` của DỰ ÁN, skill từ `pluginDirs`, và skill
   built-in đang khả dụng trong session. Đọc mô tả; cái nào khớp việc đang làm thì DÙNG qua tool Skill.
   Ưu tiên skill của dự án hơn cách mặc định vì nó mã hóa convention riêng của họ. Áp dụng ở mọi phase,
   đặc biệt execute (sinh code) và test (skill test riêng của dự án).

## Tận dụng built-in của Claude (bắt buộc ưu tiên)

- **TodoWrite**: dùng để track task trong session khi execute; đồng bộ ra `.sdlc/<version>/<sprint>/tasks.md`
  để persist qua session.
- **Subagents (Agent tool)**: mỗi phase nên spawn agent chuyên biệt tương ứng
  (product-analyst, architect, feature-builder, test-strategist, qa-guard); `ui-designer` cho nhánh giao
  diện khi sprint có màn hình (nguồn thiết kế: bản ngoài / DESIGN.md / phong cách app cũ / hỏi user);
  và `reviewer` để kiểm chéo độc lập sau analyze/design. Chạy song song khi các phần độc lập; cô lập
  context của từng phase.
- **Skill built-in cho thiết kế**: `artifact-design` (nguyên tắc giao diện), `dataviz` (biểu đồ/dashboard) —
  dùng ở nhánh ui-designer.
- **Bash**: ping port để phát hiện service đang chạy; chạy test runner; smoke test API bằng curl.
- **Playwright** (đã cài sẵn trong môi trường): tự động hóa test UI. KHÔNG chạy `playwright install`.
- **Skills**: load skill phù hợp theo phase (đã kèm trong plugin này).
- **Hooks**: `SessionStart` hook in tiến trình SDLC đang dở (`.sdlc/<version>/state.md`) để hỗ trợ resume (xem `hooks/`).

## Pre-flight trước khi execute (RẤT QUAN TRỌNG)

Trước khi viết dòng code đầu tiên trong execute:
1. Phát hiện & ưu tiên dùng skill sẵn có trong repo (nguyên tắc 7).
2. Suy ra service/tool bên ngoài cần chạy TỪ CONFIG dự án (docker-compose, .env.example, package.json
   scripts, Procfile, Makefile, README) — không đoán mò. Liệt kê kèm port + lệnh khởi động chuẩn.
3. Tự `ping`/check port xem cái nào đã chạy.
4. CHỈ hỏi user bật những cái còn thiếu, kèm lệnh gợi ý (lấy từ config).
5. Đợi user xác nhận ("ok"/"xong") RỒI mới tiếp tục. Không tự giả định service đã sẵn sàng. Ghi service
   đã xác nhận vào `.sdlc/<version>/state.md`.
6. **DB migration/seed**: nếu sprint đổi schema (model/migration mới), xác định lệnh migrate của dự án (từ
   config: `package.json`, `Makefile`, framework CLI) và CHẠY nó trước khi test — schema chưa migrate là
   nguồn "lỗi vặt" kinh điển (API 500) khi manual test. Ghi migration đã chạy vào state.

## Chọn chiến lược test (tự phát hiện)

Xem skill `test-strategy`. Nguyên tắc: tự động hóa tối đa. Chỉ flag "cần user verify tay" khi
thực sự không thể tự động (OTP SMS thật, Face ID, thanh toán tiền thật...).

## Khi nào hỏi user

- Danh sách sprint sau `sprint-plan` (để user reorder/chốt tech stack).
- Open Questions trong analyze mà bạn không thể tự resolve an toàn.
- Design UI, **dự án MỚI chưa có nguồn thẩm mỹ nào**: hỏi 1 lần định hướng phong cách (có DESIGN.md? / mô tả
  tone-màu-app tham chiếu / để Claude tự quyết) rồi chốt thành `DESIGN.md`. Dự án CŨ thì KHÔNG hỏi — bám app
  hiện có. Nếu sprint nhận bản design từ ngoài mà file chưa về → hỏi/chờ (`waiting-external`).
- Pre-flight: yêu cầu bật service ngoài.
- Ngoài các điểm trên, trong `/sdlc:run` hãy chạy tự động hết mức có thể; báo cáo gọn sau mỗi
  phase và tiếp tục.
