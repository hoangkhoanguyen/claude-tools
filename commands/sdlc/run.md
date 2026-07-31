---
description: Chạy trọn một sprint bằng một lệnh duy nhất — analyze, design, tasks, execute, test — và resume được. Ngắt giữa chừng thì chạy lại y lệnh cũ để làm tiếp từ đúng chỗ.
argument-hint: <version-slug> <sprint-slug>
---

# /sdlc:run

Lệnh chính. Chạy toàn bộ vòng đời cho MỘT sprint và tự lưu state để resume.

## Đầu vào

- `$1`: version slug (vd `v1`, `v2`). Nếu trống, đọc `.sdlc/versions.md` lấy version đang active.
- `$2`: sprint slug (vd `sprint-1-auth`). Nếu trống, đọc `.sdlc/<version>/state.md` lấy sprint đang dở,
  hoặc hỏi user.

Mọi file output trong lệnh này đều nằm dưới `.sdlc/<version>/`.

## Chính sách model (đọc trước, ảnh hưởng cả lệnh)

Lệnh này nên chạy bằng **Opus** — nó giữ mọi quyết định của sprint (approval gate, xử lý `DESIGN_GAP`,
chốt phạm vi) và phải sống suốt 6 phase. Nếu session đang chạy model khác, cứ chạy tiếp; đừng dừng lại
để đòi đổi model.

Model của từng subagent **đã khai trong frontmatter của chính agent đó** (`agents/*.md`) — bạn KHÔNG
truyền tham số `model` khi spawn, để khỏi ghi đè chính sách:

| Agent | Model | Vì sao |
|---|---|---|
| `product-analyst`, `architect`, `ui-designer`, `reviewer` | opus | Phase 1-3 là nơi sai một lần thì mọi phase sau kế thừa lỗi |
| `preflight-scout`, `implement-coordinator`, `feature-builder`, `test-strategist`, `qa-guard` | sonnet | Phase 4-6 là việc lặp lại, có spec rõ trong tay |

**Leo thang lên Opus là việc của agent thực thi, không phải của bạn.** `implement-coordinator`,
`test-strategist`, `qa-guard` tự nâng `feature-builder` lên Opus khi Sonnet đã thất bại đủ 5 lượt cho
cùng một chỗ (chi tiết trong file agent). Bạn chỉ nhận status ở dòng đầu báo cáo. Đừng tự spawn lại một
agent bằng Opus chỉ vì nó trả `BLOCKED` — hạn mức leo thang đã dùng hết trước khi status đó tới tay bạn;
`BLOCKED` nghĩa là cần người quyết định, không phải cần model to hơn.

Ngoại lệ duy nhất bạn được truyền `model` khi spawn: user nói rõ trong câu lệnh muốn chạy khác đi
(vd "sprint này chạy Opus hết cho chắc").

## BƯỚC 0 — Resume + Dependency check (LUÔN làm đầu tiên)

**KHÔNG tự nạp CLAUDE.md / architecture.md ở đây.** Từ Phase 1, mỗi subagent tự nạp phần liên quan
tới nó cold-start. Conversation chính chỉ giữ state + Human Review blocks để điều phối và relay
cho user — nguyên tắc "Kỷ luật context" áp dụng xuyên suốt, không chỉ từ Phase 4.

1. **Dependency check**: đọc `.sdlc/<version>/sprints.md`. Nếu sprint này phụ thuộc sprint khác mà sprint đó
   CHƯA `done` → CẢNH BÁO user và dừng, đề nghị chạy sprint phụ thuộc trước (trừ khi user yêu cầu vẫn tiếp).
   Nếu sprint phụ thuộc vào sprint ở version trước, đọc `.sdlc/<version-trước>/sprints.md` để xác nhận.
2. **Resume check**: đọc `.sdlc/<version>/state.md` (theo schema `templates/state.template.md`) +
   `.sdlc/<version>/<sprint>/`. Xác định phase & task đang dở. **Bỏ qua** mọi phase/task đã done.
   Lần chạy đầu → bắt đầu từ analyze.
   - **Approval gate chưa qua**: một phase có thể `done` nhưng approval của nó vẫn `pending` (bị ngắt ngay
     tại gate). Trước khi sang phase sau, kiểm tra: `analyze: done` mà `analyze_approved: pending`,
     `design_system` + `design_ui` xong mà `design_approved: pending`, hoặc `tasks: done` mà
     `tasks_approved: pending` → **trình bày lại đúng gate đó và đợi user approve**, KHÔNG nhảy sang
     phase sau. Chỉ khi approval = `true` mới đi tiếp.
   - **Nếu `design_ui: waiting-external`**: kiểm tra `.sdlc/<version>/<sprint>/ui-design.input.md` đã về chưa.
     CÓ → ingest + chuẩn hóa, chuyển design_ui sang done. CHƯA → nhắc lại blocker và dừng.

## Chạy tuần tự các phase (bỏ qua phase đã done)

### Phase 1 — Analyze
Spawn `product-analyst` (skill `requirements-analysis`). Nó tự nạp CLAUDE.md + architecture.md +
business docs, tự chạy `self-review`, ghi `.sdlc/<version>/<sprint>/requirements.md` (bao gồm NFR +
Regression impact nếu codebase có sẵn), và trả về block Human Review sẵn để relay. **Bạn không Read
lại file** — dùng block agent trả về. Open Questions không tự resolve an toàn → hỏi user.
**→ Reviewer gate**: spawn `reviewer` (nó tự đọc file). `NEEDS_FIX` → sửa rồi review lại; chỉ `PASS`
mới sang bước tiếp.

**→ Human approval gate (BẮT BUỘC)**: Trình bày tóm tắt phần "Human Review" của `requirements.md` cho user,
sau đó **DỪNG và hỏi user có approve không** trước khi chạy Design. Ví dụ:

> ✅ Analyze xong. Tóm tắt requirements:
> - [liệt kê ngắn user stories / scope chính]
> - [số AC, số edge case, NFR đáng chú ý]
>
> Reply **"ok"** hoặc **"approve"** để tiếp tục Design, hoặc feedback để điều chỉnh requirements trước.

Chỉ tiếp tục Phase 2 khi user xác nhận. Ghi `analyze_approved: true` vào `.sdlc/<version>/state.md`.

### Phase 2 — Design (2 nhánh song song, ĐỘC LẬP)
Cả 2 agent tự nạp CLAUDE.md/architecture.md/requirements.md cold — bạn KHÔNG đọc hộ.
- **Hệ thống**: spawn `architect` (skill `system-design`) → ghi `.sdlc/<version>/<sprint>/design.md`;
  cập nhật `.sdlc/architecture.md` nếu thêm/đổi thành phần nền tảng. Nhánh này chỉ cần `requirements.md`
  — **KHÔNG chờ UI design**, cứ chạy tới `done`.
- **Giao diện**: spawn `ui-designer` (skill `design-fidelity` + `artifact-design`). Xét UI scope trong
  `requirements.md`, nguồn design chọn theo từng màn:
  - Requirements **không có màn hình** → `design_ui: n/a`, bỏ nhánh.
  - Requirements **có màn hình** → `ui-design.md` phải phủ đủ mọi màn/state:
    - Màn có trong bản ngoài `.sdlc/<version>/<sprint>/ui-design.input.md` → ingest + chuẩn hóa `[external]`.
    - Màn không được cấp → tự sinh `[generated]`, ưu tiên nguồn: tokens external → `.sdlc/design-system.md`
      → DESIGN.md → dự án CŨ: phong cách app hiện có → dự án MỚI không nguồn: hỏi user 1 lần.
  Ghi `.sdlc/<version>/<sprint>/ui-design.md`; cập nhật `.sdlc/design-system.md`.

**Đồng bộ trước khi sang Tasks**: chỉ chuyển Phase 3 khi nhánh UI đã có `ui-design.md` hoàn chỉnh.

Self-review: mỗi agent tự chạy trước khi trả file (không cần bạn chạy hộ).
**→ Reviewer gate**: spawn `reviewer` kiểm `design.md` (+ `ui-design.md`) so với `requirements.md` —
nó tự đọc. Chỉ `PASS` mới sang bước tiếp.

**→ Human approval gate (BẮT BUỘC)**: Trình bày tóm tắt phần "Human Review" của `design.md` (và
`ui-design.md` nếu có) cho user, sau đó **DỪNG và hỏi user có approve không** trước khi chạy Tasks. Ví dụ:

> ✅ Design xong. Tóm tắt:
> - [kiến trúc, data model chính, API contracts đáng chú ý]
> - [màn hình UI / design tokens nếu có]
> - [Regression-safe plan / breaking change nếu có]
>
> Reply **"ok"** hoặc **"approve"** để tiếp tục Tasks & Execute, hoặc feedback để điều chỉnh design trước.

Chỉ tiếp tục Phase 3 khi user xác nhận. Ghi `design_approved: true` vào `.sdlc/<version>/state.md`.

### Phase 3 — Tasks
Spawn subagent (skill `task-breakdown`). Nó tự nạp CLAUDE.md liên quan (theo File Change Plan trong
`design.md`) + architecture.md, tự chạy self-review, ghi `.sdlc/<version>/<sprint>/tasks.md` (status
todo), trả về list ID+mô tả ngắn để bạn đồng bộ TodoWrite (KHÔNG Read trọn `tasks.md`).
Sinh `.sdlc/<version>/<sprint>/commands.md` (giống `/sdlc:tasks`): liệt kê lệnh chạy từng task
`/sdlc:task <version> <sprint> <task-id>` và lệnh thực thi đến hết `/sdlc:execute <version> <sprint>`
(implement + test + qa) — để sau này user chạy/rà lại thủ công.

**→ Human approval gate (BẮT BUỘC)**: Trình bày tóm tắt `tasks.md` cho user, sau đó **DỪNG và hỏi
user có approve không** trước khi chạy Execute. Ví dụ:

> ✅ Tasks xong. Tóm tắt:
> - [số task, danh sách ngắn từng task kèm AC phục vụ]
> - [task nào chạy song song, thứ tự phụ thuộc đáng chú ý]
>
> Reply **"ok"** để `/sdlc:run` chạy tiếp đến hết (implement + test + qa). Hoặc dừng đây và tự chạy:
> `/sdlc:execute` (thực thi đến hết) / `/sdlc:task` (làm thủ công từng task).

Chỉ tiếp tục Phase 4 khi user xác nhận. Ghi `tasks_approved: true` vào `.sdlc/<version>/state.md`.

### Phase 4 — Execute (quan trọng nhất)

**4a. Pre-flight (BẮT BUỘC trước khi code):**
Từ đây tới hết Phase 6, context của bạn phải tiết kiệm tối đa — nó đã mang theo cả analyze + design +
tasks. Mọi agent thực thi tự nạp `CLAUDE.md`/`design.md`/skill của repo khi khởi động, nên **đừng đọc
lại giúp chúng**.

- **Spawn `preflight-scout`** (read-only): nó đọc `docker-compose.yml`, `.env.example`, `package.json`
  scripts, `Procfile`, `Makefile`, README giúp bạn, tự ping port, trả về bảng service + port + trạng
  thái + lệnh bật + lệnh migrate. Bạn không tự đọc đống config đó.
- **Chốt service cho cả Phase 4-5-6 một lượt** — bảng của scout đã gồm dev server/sandbox mà Test và QA
  cần. Hỏi thiếu ở đây thì Phase 5/6 trả `NEEDS_SERVICE`, mỗi lần spawn lại là một cold-start.
- CHỈ hỏi user bật cái scout báo "chưa chạy", kèm lệnh nó đưa ra. ĐỢI user xác nhận rồi mới tiếp.
  Ghi `services_up` vào `.sdlc/<version>/state.md` — đây là **lần cuối** bạn ghi file này trong sprint.
- **Migration/seed**: scout báo sprint đổi schema → chạy lệnh migrate nó đưa ra (sau khi DB lên). Ghi vào state.

**4b. Implement — giao trọn cho `implement-coordinator`:**
KHÔNG tự điều phối từng task trong conversation này (context còn phải đủ cho Phase 5 + 6).
Đồng bộ TodoWrite một lần (lấy ID + mô tả bằng Grep có đích vào `tasks.md`, không Read trọn file —
mỗi task có 7 field mà bạn chỉ cần 2), rồi spawn subagent `implement-coordinator`, truyền `version`, `sprint`,
tên sprint branch, `services_up` đã xác nhận. Nó tự chia wave theo phụ thuộc → giao từng task cho
`feature-builder` (task độc lập song song) → commit từng task → ghi `tasks.md` + `state.md`.

**Trong lúc nó chạy, bạn KHÔNG chạm `tasks.md` / `state.md` / git index** — nó là người ghi duy nhất.

Xử lý status nó trả về: `DONE` → Phase 5. `BLOCKED` → dừng, báo user. `DESIGN_GAP` → **bạn quyết định,
`architect` viết**: gap nhỏ & rõ thì spawn `architect` kèm mô tả gap để nó vá `design.md` (đừng tự đọc
`design.md` để sửa), gap lớn thì đề nghị `/sdlc:replan`; xong spawn coordinator mới. `NEEDS_SERVICE` →
hỏi user bật, đợi "ok", spawn lại. `CONTEXT_LIMIT` → spawn coordinator mới tiếp tục (tiến độ đã trên disk).
Relay báo cáo dạng tóm tắt ngắn cho user.

### Phase 5 — Test
Spawn `test-strategist` (skill `test-strategy`) → viết + chạy test. Nếu có UI design: visual verification
(skill `design-fidelity`) — screenshot mỗi màn/state + dark/light, baseline trong
`.sdlc/<version>/<sprint>/visual-baseline/`. Ghi `.sdlc/<version>/<sprint>/test-report.md`.
**Nó tự đóng vòng fix (tối đa 5 vòng Sonnet + 1 vòng escalate Opus) và tự commit test file + fix** — bạn KHÔNG điều phối vòng fix,
KHÔNG chạm git index khi nó chạy. Xử lý status như Phase 4b.

### Phase 6 — QA Gate
Spawn `qa-guard`: full test + happy path + regression + NFR + design fidelity + quét hardcode/TODO.
**Cũng tự đóng vòng fix (tối đa 5 vòng Sonnet + 1 vòng escalate Opus, mỗi vòng chạy lại checklist từ đầu) và tự commit.**
Bạn chỉ nhận status; chỉ `DONE` mới sang bàn giao.

## Bàn giao

Cập nhật trạng thái sprint = `done` trong `.sdlc/<version>/sprints.md`.
Nếu tất cả sprint trong version đều `done`, cập nhật `.sdlc/versions.md`: version này = `done`.

Trình bày Pre-manual Report: đã tự động cover / cần user verify tay / edge case chưa define.
Nhắc user: sprint tiếp theo `/sdlc:run <version> <sprint-slug>`; version mới `/sdlc:sprint-plan <version>`.

## Quản lý context / checkpoint

- **Phase 1-3 (analyze → design → tasks)**: bạn cập nhật `.sdlc/<version>/state.md` sau mỗi phase.
- **Phase 4-6 (execute → test → qa)**: agent đang chạy sở hữu `state.md` và tự cập nhật sau mỗi task /
  mỗi chặng. **Bạn KHÔNG ghi vào đó nữa** sau khi đã ghi `services_up` ở pre-flight — hai writer trên
  cùng một file là nguồn hỏng state. Bạn cũng không chạy skill `self-review` thay chúng: mỗi agent đã
  có mục self-review BẮT BUỘC của riêng nó.
- Từ Phase 4 trở đi bạn không `git add`/`commit`/`push`, không sửa `design.md`/`requirements.md`/`tasks.md`.
  Ngoại lệ duy nhất: bàn giao (`sprints.md`, `versions.md`).
- Nếu context sắp đầy: hoàn tất task/phase hiện tại → DỪNG → báo user chạy lại `/sdlc:run <version> <sprint>`.
- Spawn subagent cho từng phase để cô lập context — kể cả các phase tưởng là nhẹ.
