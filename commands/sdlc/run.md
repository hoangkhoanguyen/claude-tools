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

## BƯỚC 0 — Context + Resume + Dependency check (LUÔN làm đầu tiên)

1. **Nạp context dự án** (nguyên tắc 0 trong CLAUDE.md của plugin): Glob mọi `CLAUDE.md`, tự đánh giá &
   đọc các file liên quan tới sprint này; đọc `.sdlc/architecture.md` (foundational, nếu có).
2. **Dependency check**: đọc `.sdlc/<version>/sprints.md`. Nếu sprint này phụ thuộc sprint khác mà sprint đó
   CHƯA `done` → CẢNH BÁO user và dừng, đề nghị chạy sprint phụ thuộc trước (trừ khi user yêu cầu vẫn tiếp).
   Nếu sprint phụ thuộc vào sprint ở version trước, đọc `.sdlc/<version-trước>/sprints.md` để xác nhận.
3. **Resume check**: đọc `.sdlc/<version>/state.md` (theo schema `templates/state.template.md`) +
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
Spawn subagent `product-analyst` (dùng skill `requirements-analysis`) → ghi
`.sdlc/<version>/<sprint>/requirements.md` (bao gồm cả Non-functional requirements + Regression impact
nếu là codebase có sẵn). Tự soi bằng skill `self-review`. Nếu có Open Questions không tự resolve an toàn
→ hỏi user rồi mới đi tiếp.
**→ Reviewer gate**: spawn `reviewer` kiểm `requirements.md` so với tài liệu gốc. `NEEDS_FIX` → sửa rồi
review lại; chỉ `PASS` mới sang bước tiếp.

**→ Human approval gate (BẮT BUỘC)**: Trình bày tóm tắt phần "Human Review" của `requirements.md` cho user,
sau đó **DỪNG và hỏi user có approve không** trước khi chạy Design. Ví dụ:

> ✅ Analyze xong. Tóm tắt requirements:
> - [liệt kê ngắn user stories / scope chính]
> - [số AC, số edge case, NFR đáng chú ý]
>
> Reply **"ok"** hoặc **"approve"** để tiếp tục Design, hoặc feedback để điều chỉnh requirements trước.

Chỉ tiếp tục Phase 2 khi user xác nhận. Ghi `analyze_approved: true` vào `.sdlc/<version>/state.md`.

### Phase 2 — Design (2 nhánh song song, ĐỘC LẬP)
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

Cross-check self-review: mọi RULE/EC/NFR có trong bảng mapping; mọi màn hình có Design AC (nếu có UI).
**→ Reviewer gate**: spawn `reviewer` kiểm `design.md` (+ `ui-design.md`) so với `requirements.md`.
Chỉ `PASS` mới sang bước tiếp.

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
Dùng skill `task-breakdown` → ghi `.sdlc/<version>/<sprint>/tasks.md` (status todo). Đồng bộ TodoWrite.
Cross-check: mọi AC/EC có task phụ trách chưa. (Reviewer optional ở phase này.)
Sinh `.sdlc/<version>/<sprint>/commands.md` (giống `/sdlc:tasks`): liệt kê lệnh chạy từng task
`/sdlc:task <version> <sprint> <task-id>` và lệnh chạy cả sprint `/sdlc:execute <version> <sprint>` —
để sau này user chạy/rà lại thủ công từng task.

**→ Human approval gate (BẮT BUỘC)**: Trình bày tóm tắt `tasks.md` cho user, sau đó **DỪNG và hỏi
user có approve không** trước khi chạy Execute. Ví dụ:

> ✅ Tasks xong. Tóm tắt:
> - [số task, danh sách ngắn từng task kèm AC phục vụ]
> - [task nào chạy song song, thứ tự phụ thuộc đáng chú ý]
>
> Reply **"ok"** hoặc **"execute"** để bắt đầu thực thi, hoặc `/sdlc:task` để chạy thủ công từng task.

Chỉ tiếp tục Phase 4 khi user xác nhận. Ghi `tasks_approved: true` vào `.sdlc/<version>/state.md`.

### Phase 4 — Execute (quan trọng nhất)

**4a. Pre-flight (BẮT BUỘC trước khi code):**
- **Phát hiện skill dùng được trong repo:** quét `.claude/skills`, `.claude/agents`, `.claude/commands`
  của dự án, skill từ `pluginDirs`, và skill built-in đang khả dụng.
- **Suy ra service ngoài từ config dự án**: đọc `docker-compose.yml`, `.env.example`, `package.json`
  scripts, `Procfile`, `Makefile`, README → liệt kê DB, cache, dev server, sandbox 3rd party + port +
  lệnh khởi động chuẩn.
- Bash ping/check port xem cái nào đã chạy.
- CHỈ hỏi user bật cái còn thiếu. ĐỢI user xác nhận rồi mới tiếp. Ghi vào `.sdlc/<version>/state.md`.
- **Migration/seed**: nếu sprint đổi schema → chạy lệnh migrate trước khi test. Ghi vào state.

**4b. Implement:**
Spawn `feature-builder` chạy từng task (song song nếu độc lập). Mỗi task: implement → test cục bộ →
pass → commit task trên sprint branch → cập nhật `.sdlc/<version>/<sprint>/tasks.md` + TodoWrite +
`.sdlc/<version>/state.md` → task tiếp. Self-review sau mỗi task.

### Phase 5 — Test
Spawn `test-strategist` (skill `test-strategy`) → viết + chạy test. Nếu có UI design: visual verification
(skill `design-fidelity`) — screenshot mỗi màn/state + dark/light, baseline trong
`.sdlc/<version>/<sprint>/visual-baseline/`. Ghi `.sdlc/<version>/<sprint>/test-report.md`.

### Phase 6 — QA Gate
Spawn `qa-guard`: full test + happy path + regression + NFR + design fidelity + quét hardcode/TODO.
Chỉ khi sạch mới sang bàn giao.

## Bàn giao

Cập nhật trạng thái sprint = `done` trong `.sdlc/<version>/sprints.md`.
Nếu tất cả sprint trong version đều `done`, cập nhật `.sdlc/versions.md`: version này = `done`.

Trình bày Pre-manual Report: đã tự động cover / cần user verify tay / edge case chưa define.
Nhắc user: sprint tiếp theo `/sdlc:run <version> <sprint-slug>`; version mới `/sdlc:sprint-plan <version>`.

## Quản lý context / checkpoint

- Cập nhật `.sdlc/<version>/state.md` sau MỖI phase và MỖI task.
- Nếu context sắp đầy: hoàn tất task/phase hiện tại → DỪNG → báo user chạy lại `/sdlc:run <version> <sprint>`.
- Spawn subagent cho từng phase để cô lập context.
