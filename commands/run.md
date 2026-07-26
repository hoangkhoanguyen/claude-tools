---
description: Chạy trọn một sprint bằng một lệnh duy nhất — analyze, design, tasks, execute, test — và resume được. Ngắt giữa chừng thì chạy lại y lệnh cũ để làm tiếp từ đúng chỗ.
argument-hint: <sprint-slug>
---

# /sdlc:run

Lệnh chính. Chạy toàn bộ vòng đời cho MỘT sprint và tự lưu state để resume.

## Đầu vào

Sprint cần chạy: `$1`. Nếu trống, đọc `.sdlc/state.md` để lấy sprint đang dở, hoặc hỏi user.

## BƯỚC 0 — Resume check (LUÔN làm đầu tiên)

Đọc `.sdlc/state.md` và `.sdlc/<sprint>/`:
- Xác định phase đang ở (analyze / design / tasks / execute / test) và task đang dở.
- **Bỏ qua** mọi phase/task đã done. Chỉ làm phần chưa xong.
- Nếu là lần chạy đầu (chưa có gì) → bắt đầu từ analyze.

## Chạy tuần tự các phase (bỏ qua phase đã done)

### Phase 1 — Analyze
Spawn subagent `product-analyst` (dùng skill `requirements-analysis`) → ghi `requirements.md`.
Tự soi bằng skill `self-review`. Nếu có Open Questions không tự resolve an toàn → hỏi user rồi mới đi tiếp.

### Phase 2 — Design
Spawn subagent `architect` (dùng skill `system-design`) → ghi `design.md`.
Cross-check: mọi RULE/EC đã có trong bảng mapping chưa (self-review). Thiếu → bổ sung.

### Phase 3 — Tasks
Dùng skill `task-breakdown` → ghi `tasks.md` (status todo). Đồng bộ TodoWrite.
Cross-check: mọi AC/EC có task phụ trách chưa.

### Phase 4 — Execute (quan trọng nhất)

**4a. Pre-flight (BẮT BUỘC trước khi code):**
- Đọc design + tech stack → liệt kê mọi service/tool ngoài cần chạy (DB, cache, dev server, sandbox 3rd party).
- Bash ping/check port xem cái nào đã chạy.
- CHỈ hỏi user bật cái còn thiếu, kèm lệnh gợi ý. VÍ DỤ trình bày:
  ```
  ⚠️ Cần bật trước khi execute:
    [ ] PostgreSQL  → port 5432
    [ ] Dev server  → port 3000 (chạy: npm run dev)
  Đang chạy sẵn: Redis (6379)
  Bật xong reply "ok" để tiếp tục.
  ```
- ĐỢI user xác nhận rồi mới tiếp. Không giả định service đã sẵn sàng.

**4b. Implement:**
Spawn `feature-builder` chạy từng task (song song nếu độc lập). Mỗi task: implement → test cục bộ → pass →
cập nhật `tasks.md` + TodoWrite + `state.md` → task tiếp. Self-review sau mỗi task (EC/TODO/hardcode).

### Phase 5 — Test
Spawn `test-strategist` (dùng skill `test-strategy`) → tự chọn cách test theo stack, viết + chạy test,
Playwright cho UI. Ghi `test-report.md`. Mọi AC/EC phải có test hoặc được liệt kê verify-tay.

### Phase 6 — QA Gate
Spawn `qa-guard`: chạy full test + đi happy path từng story + quét hardcode/TODO/unhandled error.
Chỉ khi sạch mới sang bàn giao.

## Bàn giao

Cập nhật trạng thái sprint = `done` trong `.sdlc/sprints.md`. Trình bày Pre-manual Report của qa-guard:
- Đã tự động cover (user không cần kiểm)
- Cần user verify tay (chỉ nghiệp vụ)
- Edge case chưa define (nếu có)

Nhắc user: manual test giờ chỉ nên gặp vấn đề nghiệp vụ, không lỗi vặt. Sprint tiếp theo: `/sdlc:run <slug>`.

## Lưu ý resume
Cập nhật `.sdlc/state.md` sau MỖI phase và MỖI task. Nếu hết limit / bị ngắt, lần chạy sau `/sdlc:run <slug>`
tự đọc state và tiếp tục — tuyệt đối không làm lại phần đã done.
