---
description: Chạy trọn một sprint bằng một lệnh duy nhất — analyze, design, tasks, execute, test — và resume được. Ngắt giữa chừng thì chạy lại y lệnh cũ để làm tiếp từ đúng chỗ.
argument-hint: <sprint-slug>
---

# /sdlc:run

Lệnh chính. Chạy toàn bộ vòng đời cho MỘT sprint và tự lưu state để resume.

## Đầu vào

Sprint cần chạy: `$1`. Nếu trống, đọc `.sdlc/state.md` để lấy sprint đang dở, hoặc hỏi user.

## BƯỚC 0 — Context + Resume + Dependency check (LUÔN làm đầu tiên)

1. **Nạp context dự án** (nguyên tắc 0 trong CLAUDE.md của plugin): Glob mọi `CLAUDE.md`, tự đánh giá &
   đọc các file liên quan tới sprint này; đọc `.sdlc/architecture.md` (foundational, nếu có).
2. **Dependency check**: đọc `.sdlc/sprints.md`. Nếu sprint này phụ thuộc sprint khác mà sprint đó CHƯA
   `done` → CẢNH BÁO user và dừng, đề nghị chạy sprint phụ thuộc trước (trừ khi user yêu cầu vẫn tiếp).
3. **Resume check**: đọc `.sdlc/state.md` (theo schema `templates/state.template.md`) + `.sdlc/<sprint>/`.
   Xác định phase & task đang dở. **Bỏ qua** mọi phase/task đã done. Lần chạy đầu → bắt đầu từ analyze.

## Chạy tuần tự các phase (bỏ qua phase đã done)

### Phase 1 — Analyze
Spawn subagent `product-analyst` (dùng skill `requirements-analysis`) → ghi `requirements.md`
(bao gồm cả Non-functional requirements + Regression impact nếu là codebase có sẵn).
Tự soi bằng skill `self-review`. Nếu có Open Questions không tự resolve an toàn → hỏi user rồi mới đi tiếp.
**→ Reviewer gate**: spawn `reviewer` kiểm `requirements.md` so với tài liệu gốc. `NEEDS_FIX` → sửa rồi
review lại; chỉ `PASS` mới sang Design.

### Phase 2 — Design (2 nhánh song song, ĐỘC LẬP)
- **Hệ thống**: spawn `architect` (skill `system-design`) → ghi `design.md`; cập nhật `.sdlc/architecture.md`
  nếu thêm/đổi thành phần nền tảng. Nhánh này chỉ cần `requirements.md` — **KHÔNG chờ UI design**, cứ chạy tới
  `done` kể cả khi nhánh giao diện đang chờ input ngoài.
- **Giao diện**: spawn `ui-designer` (skill `design-fidelity` + `artifact-design`). Xét **UI scope trong
  `requirements.md`** (không theo file có sẵn), nguồn design chọn **theo từng màn**:
  - Requirements **không có màn hình** → `design_ui: n/a`, bỏ nhánh.
  - Requirements **có màn hình** → `ui-design.md` phải phủ đủ mọi màn/state:
    - Màn có trong bản ngoài `.sdlc/<sprint>/ui-design.input.md` → ingest + chuẩn hóa `[external]`.
    - Màn không được cấp → tự sinh `[generated]`, ưu tiên nguồn: tokens phần external → DESIGN.md → **dự án
      CŨ: phong cách app hiện có (bắt buộc bám, không hỏi)** → **dự án MỚI không nguồn nào: hỏi user MỘT LẦN**
      (a) có DESIGN.md? (b) mô tả phong cách? (c) Claude tự quyết → (b)/(c) sinh `DESIGN.md` gốc repo rồi sinh spec.
    - `ui_design_source: external | mixed | internal`. CHỈ `waiting-external` khi user nói rõ sẽ cấp bản
      ngoài mà file chưa về. KHÔNG im lặng bỏ nhánh.
  Ghi `ui-design.md`; cập nhật `.sdlc/design-system.md`.

**Đồng bộ trước khi sang Tasks**: system design có thể `done` sớm, nhưng chỉ chuyển Phase 3 khi nhánh UI đã có
`ui-design.md` hoàn chỉnh (thoát trạng thái `waiting-external`) — vì Tasks/Execute/Test tiêu thụ nó.

Cross-check self-review: mọi RULE/EC/NFR có trong bảng mapping; mọi màn hình có Design AC (nếu có UI).
**→ Reviewer gate**: spawn `reviewer` kiểm `design.md` (+ `ui-design.md`) so với `requirements.md`.
Chỉ `PASS` mới sang Tasks.

### Phase 3 — Tasks
Dùng skill `task-breakdown` → ghi `tasks.md` (status todo). Đồng bộ TodoWrite.
Cross-check: mọi AC/EC có task phụ trách chưa. (Reviewer optional ở phase này.)

### Phase 4 — Execute (quan trọng nhất)

**4a. Pre-flight (BẮT BUỘC trước khi code):**
- **Phát hiện skill dùng được trong repo:** quét `.claude/skills`, `.claude/agents`, `.claude/commands`
  của dự án, skill từ `pluginDirs`, và skill built-in đang khả dụng. Skill nào khớp việc sắp làm →
  ưu tiên dùng qua tool Skill thay vì tự chế. Ưu tiên skill của DỰ ÁN vì nó mã hóa convention riêng.
- **Suy ra service ngoài cần chạy từ config dự án**, KHÔNG đoán mò: đọc `docker-compose.yml`, `.env.example`,
  `package.json` (scripts), `Procfile`, `Makefile`, README → liệt kê DB, cache, dev server, sandbox 3rd party
  + port + lệnh khởi động chuẩn của dự án.
- Bash ping/check port xem cái nào đã chạy.
- CHỈ hỏi user bật cái còn thiếu, kèm lệnh gợi ý (lấy từ config, không tự chế). VÍ DỤ:
  ```
  ⚠️ Cần bật trước khi execute:
    [ ] PostgreSQL  → port 5432 (docker compose up -d db)
    [ ] Dev server  → port 3000 (npm run dev)
  Đang chạy sẵn: Redis (6379)
  Bật xong reply "ok" để tiếp tục.
  ```
- ĐỢI user xác nhận rồi mới tiếp. Không giả định service đã sẵn sàng. Ghi service đã xác nhận vào `state.md`.

**4b. Implement:**
Spawn `feature-builder` chạy từng task (song song nếu độc lập). Mỗi task: implement → test cục bộ → pass →
(nếu repo là git & user không tắt) commit task trên sprint branch → cập nhật `tasks.md` + TodoWrite +
`state.md` → task tiếp. Self-review sau mỗi task (EC/TODO/hardcode). Task UI: theo skill `design-fidelity` —
mọi giá trị thị giác qua design token, không hardcode; implement đủ mọi state đã spec.

### Phase 5 — Test
Spawn `test-strategist` (dùng skill `test-strategy`) → tự chọn cách test theo stack, viết + chạy test,
Playwright cho UI. Nếu có UI design: thêm **visual verification** (skill `design-fidelity`) — chụp screenshot
mỗi màn hình/state ở breakpoint + dark/light, đối chiếu Design AC, tạo/so baseline trong
`.sdlc/<sprint>/visual-baseline/`. Ghi `test-report.md`. Mọi AC/EC/NFR/DAC phải có test hoặc liệt kê verify-tay.

### Phase 6 — QA Gate
Spawn `qa-guard`: chạy full test + happy path từng story + **regression happy path feature cũ** + NFR check +
**design fidelity check** (nếu có UI: token đúng, contrast/a11y, responsive, dark/light, state đầy đủ) +
quét hardcode/TODO/unhandled error. Chỉ khi sạch mới sang bàn giao.

## Bàn giao

Cập nhật trạng thái sprint = `done` trong `.sdlc/sprints.md`. Trình bày Pre-manual Report của qa-guard:
- Đã tự động cover (user không cần kiểm)
- Cần user verify tay (chỉ nghiệp vụ)
- Edge case chưa define (nếu có)

Nhắc user: manual test giờ chỉ nên gặp vấn đề nghiệp vụ, không lỗi vặt. Sprint tiếp theo: `/sdlc:run <slug>`.

## Quản lý context / checkpoint (chống tràn giữa chừng)

- Cập nhật `.sdlc/state.md` (theo schema) sau MỖI phase và MỖI task — đây là điều kiện để resume.
- Nếu context sắp đầy: hoàn tất task/phase HIỆN TẠI cho tới điểm checkpoint sạch (test pass + state ghi
  xong + commit nếu có), rồi DỪNG và báo user chạy lại `/sdlc:run <slug>` để tiếp — KHÔNG bỏ dở giữa một
  task với code chưa test.
- Ưu tiên spawn subagent cho từng phase để cô lập context; kết quả chốt lại qua file trong `.sdlc/`, không
  giữ hết trong hội thoại chính.

## Lưu ý resume
Nếu hết limit / bị ngắt, lần chạy sau `/sdlc:run <slug>` tự đọc state và tiếp tục — tuyệt đối không làm
lại phần đã done.
