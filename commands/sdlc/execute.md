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

## Pre-flight (BẮT BUỘC trước khi code)

0. **Nạp context**: đọc các `CLAUDE.md` liên quan (nguyên tắc 0) + `.sdlc/architecture.md`.
1. **Phát hiện skill dùng được trong repo.** Quét `.claude/skills`, `.claude/agents`, `.claude/commands`
   của dự án, skill từ `pluginDirs`, và skill built-in đang khả dụng.
2. **Suy ra service ngoài từ config dự án**: đọc `docker-compose.yml`, `.env.example`, `package.json`
   scripts, `Procfile`, `Makefile`, README → liệt kê DB/cache/dev server/sandbox 3rd party kèm port +
   lệnh khởi động chuẩn.
3. Bash ping/check port xem cái nào đang chạy.
4. CHỈ hỏi user bật cái còn thiếu, kèm lệnh gợi ý. ĐỢI user xác nhận "ok" rồi mới tiếp tục.
   Ghi service đã xác nhận vào `.sdlc/<version>/state.md`.
5. **Migration**: nếu sprint đổi schema → xác định lệnh migrate của dự án và chạy trước khi test.
   Ghi vào state.

## Chặng 1 — Implement (giao trọn cho `implement-coordinator`)

Chặng này ồn nhất (report từng task + commit + ghi state). Đừng chạy trong conversation này —
**spawn subagent `implement-coordinator`** để cô lập context, giữ chỗ cho Chặng 2 + 3.

Trước khi spawn: đồng bộ TodoWrite một lần (một item cho mỗi task chưa done) để user thấy phạm vi.

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
| `DESIGN_GAP` | Quyết định: vá `design.md` tại chỗ (nếu nhỏ, rõ) hoặc đề nghị user `/sdlc:replan`. Xong → spawn coordinator mới tiếp tục |
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

**Nó tự đóng vòng fix (tối đa 3 vòng) và tự commit test file + fix.** Bạn KHÔNG điều phối vòng fix,
KHÔNG chạm git index khi nó đang chạy — đẩy vòng fix về đây là nguồn tốn context ở conversation chính.
Xử lý status nó trả về theo cùng bảng như Chặng 1 (`DONE` → sang Chặng 3; `BLOCKED` → dừng báo user;
`DESIGN_GAP` / `NEEDS_SERVICE` / `CONTEXT_LIMIT` → xử lý rồi spawn lại). Relay tóm tắt ngắn cho user.

## Chặng 3 — QA gate + bàn giao

Spawn subagent `qa-guard`: full test + happy path từng story + regression happy path feature cũ liên quan +
NFR check + design fidelity (nếu có UI) + quét hardcode/TODO/unhandled error.

**Nó cũng tự đóng vòng fix (tối đa 3 vòng) và tự commit** — mỗi vòng fix nó chạy lại checklist từ đầu.
Bạn chỉ nhận status, không tự fix, không chạm git. Chỉ khi status `DONE` mới bàn giao:

- Cập nhật sprint = `done` trong `.sdlc/<version>/sprints.md`; nếu mọi sprint trong version đã `done` →
  cập nhật `.sdlc/versions.md` version = `done`.
- Trình bày Pre-manual Report: đã tự động cover / cần user verify tay / edge case chưa define.
- Nhắc user: sprint tiếp theo `/sdlc:run <version> <sprint-slug>`; version mới `/sdlc:sprint-plan <version>`.

Kết thúc mỗi chặng: chạy skill `self-review`, cập nhật `.sdlc/<version>/state.md`.
