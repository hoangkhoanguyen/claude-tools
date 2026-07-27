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

## Chặng 1 — Implement

Spawn subagent `feature-builder` — **mỗi task một subagent**; task độc lập thì spawn SONG SONG,
task có phụ thuộc thì đợi task trước `done`. Bỏ qua task đã `done`.

Subagent chỉ implement + test cục bộ + self-review rồi báo kết quả về. **Bạn (lệnh này) giữ quyền ghi**,
làm TUẦN TỰ theo thứ tự task hoàn thành — kể cả khi implement chạy song song:
1. Nhận báo cáo (kết quả, file đã đụng, test đã chạy, commit message đề xuất).
2. `git commit` task đó trên sprint branch (mỗi task một commit). KHÔNG push/tạo PR trừ khi user yêu cầu.
3. Cập nhật `.sdlc/<version>/<sprint>/tasks.md` (`done`, hoặc `blocked` + lý do) + TodoWrite +
   `.sdlc/<version>/state.md`.

Không để hai subagent cùng ghi state hay cùng chạm git index — đó là nguồn hỏng state khi chạy song song.

Chỉ sang Chặng 2 khi MỌI task đã `done`. Còn task `blocked` → dừng, báo blocker, không sang Test.

## Chặng 2 — Test

Spawn subagent `test-strategist` (skill `test-strategy`). Tự phát hiện stack & công cụ, chọn cách test
theo loại feature (unit / API / Playwright UI / 3rd party sandbox / mock webhook). Nếu có UI design →
visual verification (skill `design-fidelity`): screenshot đối chiếu Design AC + baseline trong
`.sdlc/<version>/<sprint>/visual-baseline/`. Viết test và CHẠY thật đến khi xanh.
Mọi AC/EC/NFR/DAC phải có test hoặc được liệt kê verify-tay. Ghi `.sdlc/<version>/<sprint>/test-report.md`.
Nếu cần app/service để test → yêu cầu user bật (như pre-flight), đợi xác nhận.

## Chặng 3 — QA gate + bàn giao

Spawn subagent `qa-guard`: full test + happy path từng story + regression happy path feature cũ liên quan +
NFR check + design fidelity (nếu có UI) + quét hardcode/TODO/unhandled error. Chỉ khi sạch mới bàn giao:

- Cập nhật sprint = `done` trong `.sdlc/<version>/sprints.md`; nếu mọi sprint trong version đã `done` →
  cập nhật `.sdlc/versions.md` version = `done`.
- Trình bày Pre-manual Report: đã tự động cover / cần user verify tay / edge case chưa define.
- Nhắc user: sprint tiếp theo `/sdlc:run <version> <sprint-slug>`; version mới `/sdlc:sprint-plan <version>`.

Kết thúc mỗi chặng: chạy skill `self-review`, cập nhật `.sdlc/<version>/state.md`.
