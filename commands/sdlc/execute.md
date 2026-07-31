---
description: Chạy phần thực thi ĐẾN HẾT cho một sprint — pre-flight, implement toàn bộ tasks, rồi Test + QA gate + bàn giao. Dùng sau khi đã có tasks (vd sau khi /sdlc:run dừng ở gate Tasks).
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:execute

Chạy phần thực thi ĐẾN HẾT cho sprint `$2` thuộc version `$1`
(nếu trống, lấy từ `.sdlc/versions.md` + `.sdlc/<version>/state.md`).

Gồm 3 chặng: **Implement → Test → QA gate + bàn giao**. Đây là "execute đến hết" — chạy trọn từ
tasks đã lên cho tới lúc bàn giao sạch. Muốn chạy lẻ đúng 1 task → dùng `/sdlc:task`.

Yêu cầu `.sdlc/<version>/<sprint>/tasks.md` đã tồn tại (chạy `/sdlc:tasks` trước nếu chưa).
Resume: bỏ qua chặng/task đã `done`, tiếp tục đúng chỗ đang dở.

## Context của lệnh này — cố tình đọc rất ít

Lệnh này **không viết code, không viết design, không chia task** — nó chỉ điều phối 3 subagent và nói
chuyện với user. Mọi agent thực thi (`implement-coordinator`, `feature-builder`, `test-strategist`,
`qa-guard`) đều tự Glob `CLAUDE.md` liên quan, tự đọc `architecture.md`/`design.md`, tự quét skill của
repo khi khởi động. Bạn đọc lại những thứ đó là trả tiền hai lần, lần thứ hai vào đúng context phải
sống suốt cả 3 chặng.

Bạn CHỈ đọc: `.sdlc/<version>/state.md` (resume), `.sdlc/<version>/sprints.md` (bàn giao), và **Grep có
đích** vào `.sdlc/<version>/<sprint>/tasks.md` để lấy ID + dòng mô tả của các task chưa done.
KHÔNG Read trọn `tasks.md` — mỗi task có 7 field mà bạn chỉ cần 2.

## Chính sách model

Lệnh này nên chạy bằng **Opus** — nó giữ quyết định (xử lý `DESIGN_GAP`, chốt bàn giao) suốt cả 3 chặng.

Model của từng subagent **đã khai trong frontmatter của agent đó** — cả 4 agent trong lệnh này
(`preflight-scout`, `implement-coordinator`, `test-strategist`, `qa-guard`) chạy **Sonnet**. Bạn KHÔNG
truyền tham số `model` khi spawn, để khỏi ghi đè chính sách.

**Leo thang lên Opus là việc của agent thực thi, không phải của bạn**: coordinator / test-strategist /
qa-guard tự nâng `feature-builder` lên Opus khi Sonnet đã thất bại đủ 5 lượt ở cùng một chỗ. Khi status
`BLOCKED` tới tay bạn thì hạn mức đó đã dùng hết — đừng spawn lại bằng Opus, `BLOCKED` nghĩa là cần
người quyết định chứ không phải cần model to hơn.

Ngoại lệ: user nói rõ muốn chạy khác đi thì làm theo user.

## Pre-flight (BẮT BUỘC trước khi code)

1. **Spawn `preflight-scout`** (read-only). Nó đọc `docker-compose.yml`, `.env.example`, `package.json`
   scripts, `Procfile`, `Makefile`, README giúp bạn, tự ping port, và trả về bảng gọn:
   service + port + trạng thái + lệnh bật + lệnh migrate. Bạn không tự đọc đống config đó.
2. **Chốt service cho CẢ 3 chặng một lượt.** Bảng của scout đã gồm cả dev server/sandbox mà Test và QA
   cần, không chỉ service lúc implement. Hỏi user bật một lần cho hết — hỏi thiếu ở đây thì Chặng 2/3
   sẽ trả `NEEDS_SERVICE`, và mỗi lần spawn lại là một agent cold-start đọc lại context từ đầu.
3. CHỈ hỏi user bật cái scout báo "chưa chạy", kèm lệnh bật nó đưa ra. ĐỢI user xác nhận "ok".
   Ghi `services_up` vào `.sdlc/<version>/state.md`.
4. **Migration**: scout báo sprint có đổi schema → chạy lệnh migrate nó đưa ra (sau khi DB đã lên).
   Ghi vào state.

Đây là **lần duy nhất** bạn ghi `state.md` trong lệnh này — từ Chặng 1 trở đi, agent sở hữu file đó.

## Chặng 1 — Implement (giao trọn cho `implement-coordinator`)

Chặng này ồn nhất (report từng task + commit + ghi state). Đừng chạy trong conversation này —
**spawn subagent `implement-coordinator`** để cô lập context, giữ chỗ cho Chặng 2 + 3.

Trước khi spawn: đồng bộ TodoWrite một lần (một item cho mỗi task chưa done) để user thấy phạm vi —
lấy ID + mô tả bằng Grep có đích như trên, không Read trọn `tasks.md`.

Truyền cho coordinator: `version`, `sprint`, tên **sprint branch**, và `services_up` đã xác nhận ở
pre-flight. Coordinator sẽ tự: chia wave theo phụ thuộc → giao từng task cho `feature-builder`
(task độc lập chạy song song) → commit từng task → cập nhật `tasks.md` + `state.md`.

**Trong lúc coordinator chạy, bạn KHÔNG chạm vào `tasks.md`, `state.md`, hay git index** — nó là
người ghi duy nhất của chặng này. Hai bên cùng ghi là nguồn hỏng state kinh điển.

Coordinator trả về status ở dòng đầu; xử lý theo bảng:

| Status | Bạn làm gì |
|---|---|
| `DONE` | Refresh TodoWrite, sang Chặng 2 |
| `BLOCKED` | DỪNG, báo blocker cho user. Không sang Test |
| `DESIGN_GAP` | **Bạn quyết định, `architect` viết.** Gap nhỏ & rõ → spawn `architect` kèm mô tả gap để nó vá `design.md` (đừng tự đọc `design.md` để sửa — đó là file to nhất sprint). Gap lớn/đụng phạm vi → đề nghị user `/sdlc:replan`. Xong → spawn coordinator mới |
| `NEEDS_SERVICE` | Hỏi user bật service (kèm lệnh gợi ý), ghi vào `services_up`, đợi "ok" → spawn coordinator mới |
| `CONTEXT_LIMIT` | Spawn coordinator mới ngay — tiến độ đã nằm trên disk nên nó tiếp đúng chỗ |

Relay báo cáo của coordinator cho user dưới dạng tóm tắt ngắn (user không thấy output subagent).

Chỉ sang Chặng 2 khi status `DONE`.

## Chặng 2 — Test

Spawn subagent `test-strategist` (skill `test-strategy`). Tự phát hiện stack & công cụ, chọn cách test
theo loại feature (unit / API / Playwright UI / 3rd party sandbox / mock webhook). Nếu có UI design →
visual verification (skill `design-fidelity`): screenshot đối chiếu Design AC + baseline trong
`.sdlc/<version>/<sprint>/visual-baseline/`. Viết test và CHẠY thật đến khi xanh.
Mọi AC/EC/NFR/DAC phải có test hoặc được liệt kê verify-tay. Ghi `.sdlc/<version>/<sprint>/test-report.md`.

**Nó tự đóng vòng fix (tối đa 5 vòng Sonnet + 1 vòng escalate Opus) và tự commit test file + fix.** Bạn KHÔNG điều phối vòng fix,
KHÔNG chạm git index khi nó đang chạy — đẩy vòng fix về đây là nguồn tốn context ở conversation chính.
Xử lý status nó trả về theo cùng bảng như Chặng 1 (`DONE` → sang Chặng 3; `BLOCKED` → dừng báo user;
`DESIGN_GAP` / `NEEDS_SERVICE` / `CONTEXT_LIMIT` → xử lý rồi spawn lại). Relay tóm tắt ngắn cho user.

## Chặng 3 — QA gate + bàn giao

Spawn subagent `qa-guard`: full test + happy path từng story + regression happy path feature cũ liên quan +
NFR check + design fidelity (nếu có UI) + quét hardcode/TODO/unhandled error.

**Nó cũng tự đóng vòng fix (tối đa 5 vòng Sonnet + 1 vòng escalate Opus) và tự commit** — mỗi vòng fix nó chạy lại checklist từ đầu.
Bạn chỉ nhận status, không tự fix, không chạm git. Chỉ khi status `DONE` mới bàn giao:

- Cập nhật sprint = `done` trong `.sdlc/<version>/sprints.md`; nếu mọi sprint trong version đã `done` →
  cập nhật `.sdlc/versions.md` version = `done`.
- Trình bày Pre-manual Report: đã tự động cover / cần user verify tay / edge case chưa define.
- Nhắc user: sprint tiếp theo `/sdlc:run <version> <sprint-slug>`; version mới `/sdlc:sprint-plan <version>`.

## Ranh giới của lệnh này (đọc lại nếu định "làm cho nhanh")

Kết thúc mỗi chặng, bạn **KHÔNG** chạy skill `self-review` và **KHÔNG** cập nhật `state.md`:

- Mỗi agent đã có mục self-review BẮT BUỘC của riêng nó và tự chạy trước khi trả kết quả.
- `state.md` từ Chặng 1 trở đi thuộc về agent đang chạy (coordinator / test-strategist / qa-guard).
  Bạn ghi thêm vào đó là tạo ra hai writer trên cùng một file — đúng thứ mà cả thiết kế này tránh.

Việc của bạn sau mỗi chặng chỉ là: đọc status ở dòng đầu báo cáo → xử lý theo bảng → relay tóm tắt
ngắn cho user. Ngoài ra, trong cả lệnh này bạn không `git add`/`commit`/`push`, không sửa `design.md`
/ `requirements.md` / `tasks.md`.

Ngoại lệ duy nhất: pre-flight (ghi `services_up`) và bàn giao (`sprints.md`, `versions.md`).
