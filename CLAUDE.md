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
  (product-analyst, architect, implement-coordinator → feature-builder, test-strategist, qa-guard).
  Chặng implement giao TRỌN cho `implement-coordinator` — nó là người ghi duy nhất (commit, `tasks.md`,
  `state.md`) và tự giao từng task cho `feature-builder`, để conversation chính không tốn context vào
  vòng lặp report-commit-ghi-state. Cùng nguyên tắc đó, `test-strategist` và `qa-guard` TỰ đóng vòng fix
  (tối đa 5 vòng Sonnet + 1 vòng escalate Opus rồi dừng) và TỰ commit — conversation chính không bao giờ điều phối vòng fix hay
  chạm git index khi một agent thực thi đang chạy; nó chỉ nhận status ở dòng đầu báo cáo
  (`DONE` / `BLOCKED` / `DESIGN_GAP` / `NEEDS_SERVICE` / `CONTEXT_LIMIT`) và xử lý theo đó;
  `ui-designer` cho nhánh giao
  diện khi sprint có màn hình (nguồn thiết kế: bản ngoài / DESIGN.md / phong cách app cũ / hỏi user);
  và `reviewer` để kiểm chéo độc lập sau analyze/design. Chạy song song khi các phần độc lập; cô lập
  context của từng phase.
- **Skill built-in cho thiết kế**: `artifact-design` (nguyên tắc giao diện), `dataviz` (biểu đồ/dashboard) —
  dùng ở nhánh ui-designer.
- **Bash**: ping port để phát hiện service đang chạy; chạy test runner; smoke test API bằng curl.
- **Playwright** (đã cài sẵn trong môi trường): tự động hóa test UI. KHÔNG chạy `playwright install`.
- **Skills**: load skill phù hợp theo phase (đã kèm trong plugin này).
- **Hooks**: `SessionStart` hook in tiến trình SDLC đang dở (`.sdlc/<version>/state.md`) để hỗ trợ resume (xem `hooks/`).

## Chính sách model (Opus điều phối — Sonnet thực thi)

Sprint chạy trọn một mạch, không ngắt để approve từng bước, nên model phải phân bổ theo **nơi sai lầm
đắt nhất**: quyết định sai ở phase đầu thì mọi phase sau kế thừa lỗi, còn code sai ở phase thực thi thì
test bắt được và fix được.

**Model đã khai sẵn trong frontmatter của từng agent (`agents/*.md`)** — đó là nguồn sự thật, và nó đi
theo khi cài plugin vào dự án khác. Conversation chính KHÔNG truyền tham số `model` khi spawn, để khỏi
ghi đè chính sách.

| Vai | Model | Lý do |
|---|---|---|
| Conversation chính (`/sdlc:*`) | user tự chọn — nên là **Opus** | Giữ mọi quyết định + approval gate, sống suốt 6 phase |
| `product-analyst`, `architect`, `ui-designer`, `reviewer` | `inherit` | Phase 1-3: sai một lần, mọi phase sau kế thừa lỗi → chạy đúng model user đã chọn |
| `preflight-scout` | sonnet | Đọc config, ping port — việc cơ học |
| `implement-coordinator` | sonnet | Chia wave + commit + ghi state theo quy trình có sẵn |
| `feature-builder` | sonnet | Có design + task spec rõ trong tay |
| `test-strategist`, `qa-guard` | sonnet | Chạy checklist, viết test theo bảng quyết định |

**Vì sao phase 1-3 dùng `inherit` chứ không ghim `opus`:** alias `opus` resolve về bản Opus mặc định của
tier, không nhất thiết là bản user đang chủ động chọn ở conversation chính. `inherit` tôn trọng lựa chọn
đó — user chọn Opus nào thì 4 agent này chạy đúng bản ấy. Hệ quả cần biết: **conversation chính chạy
Sonnet thì phase 1-3 cũng chạy Sonnet**. Vì vậy `/sdlc:sprint-plan` nhắc user bật Opus ngay ở điểm vào.

Phase 4-6 thì ngược lại — ghim cứng `sonnet`, KHÔNG `inherit`, vì mục đích của chúng chính là **hạ** model
xuống bất kể conversation chính đang chạy gì. Để `inherit` ở đây sẽ kéo cả chặng thực thi lên Opus và xoá
sạch lợi ích tốc độ/chi phí — đúng thứ mà thiết kế này nhắm tới.

### Leo thang lên Opus — do agent thực thi tự quyết

Agent điều phối (`implement-coordinator`, `test-strategist`, `qa-guard`) tự nâng `feature-builder` lên
Opus qua tham số `model` của tool `Agent`. Hạn mức đếm **theo từng task / từng chỗ hỏng**, không gộp cả sprint:

- **Lượt 1-5: Sonnet.** Mỗi lần thất bại, respawn kèm **lịch sử đã thử** — agent cold-start mỗi lần, không
  truyền lịch sử thì nó lặp lại đúng sai lầm cũ và đốt sạch hạn mức vào một hướng.
- **Lượt 6: Opus**, lượt cuối. Vẫn không xong → `BLOCKED`, cần người quyết định.
- **Leo sớm**: ba lượt liên tiếp thất bại y hệt (cùng test đỏ, cùng lỗi, cùng file) → lên Opus ngay,
  đừng chờ đủ 5. Lặp lại một hướng sai không tạo ra thông tin mới.
- **Dùng Opus ngay từ lượt đầu** khi task được đánh `Độ khó: cao`, hoặc đụng thuật toán / đồng thời /
  giao dịch phân tán / mật mã — loại việc sai một chút là hỏng ngầm, test khó bắt.
- **`DESIGN_GAP` và `NEEDS_SERVICE` KHÔNG tính vào hạn mức.** Design thiếu thì model to hơn cũng không
  đoán ra được ý đồ, còn service chưa bật thì đổi model vô nghĩa. Dừng và xử lý đúng gốc.

Nhận `BLOCKED` rồi thì **đừng spawn lại bằng Opus** — hạn mức leo thang đã dùng hết trước khi status đó
tới tay conversation chính.

### Đổi chính sách cho một dự án cụ thể

Sửa dòng `model:` trong frontmatter của agent tương ứng ở `.claude/agents/` của dự án. Installer nhận ra
file bạn đã sửa và sẽ hỏi trước khi ghi đè ở lần cài sau, nên chỉnh tay là an toàn.

## Pre-flight trước khi execute (RẤT QUAN TRỌNG)

Trước khi viết dòng code đầu tiên trong execute:
1. Phát hiện & ưu tiên dùng skill sẵn có trong repo (nguyên tắc 7) — **việc này của agent thực thi**,
   mỗi agent tự quét khi khởi động. Conversation chính không quét hộ (xem "Kỷ luật context" bên dưới).
2. **Spawn `preflight-scout`** để suy ra service/tool bên ngoài TỪ CONFIG dự án (docker-compose,
   .env.example, package.json scripts, Procfile, Makefile, README) — không đoán mò. Nó trả về bảng
   service + port + trạng thái (tự ping) + lệnh khởi động + lệnh migrate. Conversation chính KHÔNG tự
   đọc đống config đó.
3. Chốt service cho **cả chặng thực thi** (implement + test + qa) trong một lượt hỏi — dev server và
   sandbox mà Test/QA cần cũng phải nằm trong danh sách, không chỉ service lúc implement.
4. CHỈ hỏi user bật những cái scout báo "chưa chạy", kèm lệnh gợi ý nó đưa ra.
5. Đợi user xác nhận ("ok"/"xong") RỒI mới tiếp tục. Không tự giả định service đã sẵn sàng. Ghi service
   đã xác nhận vào `.sdlc/<version>/state.md`.
6. **DB migration/seed**: nếu sprint đổi schema (model/migration mới), xác định lệnh migrate của dự án (từ
   config: `package.json`, `Makefile`, framework CLI) và CHẠY nó trước khi test — schema chưa migrate là
   nguồn "lỗi vặt" kinh điển (API 500) khi manual test. Ghi migration đã chạy vào state.

## Kỷ luật context của conversation chính (áp dụng XUYÊN SUỐT sprint, không chỉ execute)

Từ Phase 1 (Analyze) trở đi, conversation chính chỉ còn 2 vai: **điều phối subagent** và **nói chuyện
với user**. Nó không tự analyze, không tự design, không tự chia task, không viết code — nên nó KHÔNG
đọc thay ai. Trước đây quy tắc này chỉ áp cho chặng execute, nhưng thực tế Phase 1-3 mới là nơi
conversation chính dễ "chết context" nhất (business docs + nhiều CLAUDE.md + codebase khảo sát).

**Nguyên tắc 0 (đọc CLAUDE.md liên quan) áp dụng cho AGENT thực thi phase đó, không phải conversation
chính.** Mỗi subagent bắt đầu cold và tự Glob/đọc CLAUDE.md của scope mình. Conversation chính chỉ
truyền path + slug + Human Review blocks nhận lại.

- **Không** Glob/đọc `CLAUDE.md` của dự án, `architecture.md`, `requirements.md`, `design.md`, business
  docs của user, không quét skill của repo, không khảo sát codebase. Mọi agent (product-analyst,
  architect, ui-designer, task-breakdown agent, implement-coordinator, test-strategist, qa-guard,
  reviewer) bắt đầu cold và tự nạp hết. Đọc lại là trả tiền hai lần.
- **Không** Read trọn `tasks.md` chỉ để đồng bộ TodoWrite — dùng list ID+mô tả agent trả về, hoặc
  Grep có đích.
- **Không** đọc file để tóm tắt cho user: agent sinh ra file PHẢI trả kèm block Human Review sẵn để
  conversation chính relay nguyên văn.
- Ở Phase 1-3, self-review là bước cuối của chính subagent trước khi trả file — conversation chính
  KHÔNG chạy `self-review` skill hộ.
- **Không** ghi `state.md`, không `git add/commit/push`, không sửa artifact (`design.md`,
  `requirements.md`, `tasks.md`) khi một agent thực thi đang chạy — agent đó là người ghi duy nhất.
  Cần vá `design.md` sau `DESIGN_GAP` → quyết định là của conversation chính, nhưng **`architect` viết**.

Ngoại lệ được phép ghi: pre-flight (`services_up`) và bàn giao (`sprints.md`, `versions.md`).

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
