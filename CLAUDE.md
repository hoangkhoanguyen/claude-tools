# SDLC Workflow Plugin — Hướng dẫn cho Claude

Đây là plugin điều phối vòng đời phát triển phần mềm theo sprint. Khi plugin này active,
bạn áp dụng các nguyên tắc dưới đây cho MỌI command `/sdlc:*`.

## Nguyên tắc cốt lõi (áp dụng xuyên suốt)

0. **Context dự án nạp MỘT LẦN, dùng lại nhiều lần — qua `.sdlc/<version>/context.md`.**
   Mỗi subagent bắt đầu cold. Nếu agent nào cũng tự quét lại repo thì một sprint 8 task (~15 agent)
   sẽ nạp lại cùng một context 15 lần — đây là khoản lãng phí token lớn nhất của workflow.

   **Lệnh cha (mọi `/sdlc:*`) làm ở BƯỚC 0 — chỉ một lần:**
   1. Kiểm tra `.sdlc/<version>/context.md`. **Có + fingerprint khớp** (bytes/mtime của các file nguồn
      trong bảng Fingerprint vẫn đúng) → ĐỌC NÓ VÀ DỪNG. **KHÔNG** Glob repo, **KHÔNG** đọc lại CLAUDE.md.
   2. Thiếu file, hoặc fingerprint lệch → chưng cất lại:
      - Glob toàn repo liệt kê mọi `CLAUDE.md` (và `AGENTS.md`/`.cursorrules` nếu có).
      - Đọc file gốc + các file lồng trong thư mục sprint sẽ đụng tới. Quy tắc kế thừa: file lồng sâu hơn
        ghi đè/bổ sung file gốc cho phạm vi thư mục của nó — mâu thuẫn thì file gần code hơn thắng.
      - Quét `.claude/skills|agents|commands` + `pluginDirs`; đọc `package.json`/`Makefile`/`docker-compose.yml`.
      - Ghi `.sdlc/<version>/context.md` theo schema `templates/context.template.md` (≤150 dòng: stack,
        lệnh build/test/migrate, module map kèm đường dẫn mọi CLAUDE.md, convention bắt buộc, skill repo,
        service ngoài). Đây là bản CHƯNG CẤT — không copy nguyên CLAUDE.md vào.
   3. Truyền **đường dẫn** `.sdlc/<version>/context.md` cho mọi subagent khi spawn.

   **Subagent làm:** đọc đúng `.sdlc/<version>/context.md`. **CẤM** Glob toàn repo tìm `CLAUDE.md`.
   Cần chi tiết ngoài phạm vi bản chưng cất → đọc ĐÚNG một file đã ghi trong "Module map".

   Không bao giờ giả định convention — luôn xác nhận từ `context.md` (hoặc file nó trỏ tới) trước.

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
    mọi thứ còn lại theo version: `.sdlc/<version>/state.md`, `.sdlc/<version>/context.md`,
    `.sdlc/<version>/<sprint>/`.
    Với monorepo nhiều app: vẫn một `.sdlc/` duy nhất ở gốc; slug sprint phản ánh app liên quan
    (vd `sprint-1-web-auth`, `sprint-2-api-orders`) để phân biệt.

4b. **`.sdlc/` luôn được commit lên git — cả team cùng thấy.** Khi khởi tạo lần đầu (`/sdlc:sprint-plan`),
    thêm vào `.gitignore` của dự án dòng sau để loại phần nặng/không cần thiết:
    ```
    .sdlc/*/*/visual-baseline/
    ```
    Còn lại (`versions.md`, `sprints.md`, `state.md`, `context.md`, `architecture.md`, `design-system.md`, mọi
    `requirements.md`, `design.md`, `ui-design.md`, `tasks.md`, `test-report.md`) đều commit — đây là
    tài liệu sống của dự án, team review được qua PR, lịch sử rõ ràng.

5. **Tự soi lại (self-review) — không cần user nhắc.** Sau mỗi phase, tự chạy checklist trong
   skill `self-review`. Không coi "làm xong = đạt". Luôn hỏi: "output này có đủ cho bước sau
   không? có mâu thuẫn với phase trước không?". Thiếu thì bổ sung TRƯỚC khi ghi file / báo xong.

6. **Bàn giao sạch.** Mục tiêu cuối: khi user manual test, họ CHỈ verify nghiệp vụ, KHÔNG gặp
   lỗi vặt (validation, API 500, empty state, crash...). Mọi thứ tự động hóa được thì phải được
   test tự động trước khi báo xong.

7. **Phát hiện & tận dụng skill sẵn có trong repo — quét MỘT LẦN, ghi vào `context.md`.**
   Lệnh cha quét `.claude/skills`, `.claude/agents`, `.claude/commands` của DỰ ÁN + skill từ `pluginDirs`
   khi chưng cất `context.md` (nguyên tắc 0), ghi vào bảng "Skill / command / agent CỦA DỰ ÁN".
   Subagent ĐỌC bảng đó, KHÔNG tự quét lại. Skill built-in thì tra ở system reminder của session.
   Cái nào khớp việc đang làm thì DÙNG qua tool Skill. Ưu tiên skill của dự án hơn cách mặc định vì nó
   mã hóa convention riêng của họ. Áp dụng ở mọi phase, đặc biệt execute (sinh code) và test.

8. **Chi phí model theo việc.** Agent làm việc checklist/cơ học (`reviewer`, `qa-guard`, `test-strategist`,
   `product-analyst`) khai báo `model: sonnet` trong frontmatter. Agent ra quyết định kiến trúc/sinh code
   (`architect`, `feature-builder`, `ui-designer`) để `model: inherit` — chạy cùng model chính.
   Đừng nâng model cho agent chỉ để "cho chắc"; đổi khi có bằng chứng chất lượng tụt.

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
1. Đọc bảng "Skill / command / agent CỦA DỰ ÁN" và "Service ngoài" trong `.sdlc/<version>/context.md`
   (đã chưng cất ở BƯỚC 0 — không quét lại config, không đoán mò).
2. Chỉ khi `context.md` thiếu/ghi `n/a` mà sprint rõ ràng cần: suy ra từ config dự án (docker-compose,
   .env.example, package.json scripts, Procfile, Makefile, README), rồi BỔ SUNG ngược vào `context.md`.
3. Tự `ping`/check port xem cái nào đã chạy.
4. CHỈ hỏi user bật những cái còn thiếu, kèm lệnh gợi ý (lấy từ `context.md`).
5. Đợi user xác nhận ("ok"/"xong") RỒI mới tiếp tục. Không tự giả định service đã sẵn sàng. Ghi service
   đã xác nhận vào `.sdlc/<version>/state.md`.
6. **DB migration/seed**: nếu sprint đổi schema (model/migration mới), dùng lệnh migrate đã ghi trong
   `context.md` và CHẠY nó trước khi test — schema chưa migrate là
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
