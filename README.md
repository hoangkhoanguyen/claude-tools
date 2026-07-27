# SDLC Workflow — Claude Code Plugin

Một plugin **cắm vào bất kỳ dự án nào** để Claude chạy trọn vòng đời phát triển theo từng sprint:
phân tích requirements → thiết kế → chia tasks → **execute + test tự động** → bàn giao sạch để bạn manual test.

Thiết kế cho dự án lớn, nhiều feature, hoặc thêm feature vào codebase có sẵn. **Stack-agnostic** — không gắn với ngôn ngữ/framework nào.

---

## Triết lý

1. **Review nhẹ, tin tưởng downstream.** Bạn chỉ review vài section ưu tiên ở đầu mỗi output; phần còn lại được viết cho agent đọc, đảm bảo các bước sau làm đúng.
2. **Mỗi sprint là một vòng khép kín.** Analyze → Design → Tasks → Execute → Test — xong sprint mới sang sprint sau.
3. **Resume được.** Hết limit / ngắt giữa chừng → chạy lại đúng lệnh cũ, tự biết làm tiếp từ đâu.
4. **Bàn giao sạch.** Khi xong, mọi lỗi vặt (validation, API error, empty state...) đã được test tự động catch. Bạn chỉ verify *trải nghiệm nghiệp vụ*, không debug.
5. **Tự soi lại mình.** Mỗi phase tự review output của chính nó và cross-check với phase trước — không cần bạn nhắc.
6. **Tận dụng built-in Claude.** Subagents, TodoWrite, Bash, Playwright, Skills, Hooks — dùng cái có sẵn thay vì tự chế.

---

## Cài đặt

### Cách 1 — `npx` (khuyến nghị, cài online 1 lệnh)

Từ thư mục **dự án đích**, chạy:

```bash
npx github:hoangkhoanguyen/claude-tools
```

Lệnh này tải installer từ branch `main`, copy `agents/`, `commands/`, `skills/`, `templates/`
và đăng ký `SessionStart` hook vào `.claude/` của dự án hiện tại. Xong là dùng được `/sdlc:*` ngay.

**Các tuỳ chọn:**

```bash
npx github:hoangkhoanguyen/claude-tools --global           # cài vào ~/.claude (mọi dự án)
npx github:hoangkhoanguyen/claude-tools --dir ./path        # cài vào .claude ở nơi khác
npx github:hoangkhoanguyen/claude-tools --only skills       # chỉ cài một phần
npx github:hoangkhoanguyen/claude-tools --skip hooks        # bỏ qua một phần
npx github:hoangkhoanguyen/claude-tools --only claude-md    # thêm nguyên tắc SDLC vào CLAUDE.md
npx github:hoangkhoanguyen/claude-tools --dry-run           # xem sẽ làm gì, không ghi gì
npx github:hoangkhoanguyen/claude-tools --list              # liệt kê thành phần
npx github:hoangkhoanguyen/claude-tools --help              # đầy đủ tuỳ chọn
```

Thành phần: `agents`, `commands`, `skills`, `templates`, `hooks` (mặc định) và
`claude-md` (opt-in — chèn nguyên tắc SDLC vào `CLAUDE.md` dưới dạng managed block).

**An toàn khi dự án đã có sẵn `.claude/`:**

- **Merge, không đè mù.** `settings.json` được merge (giữ nguyên permissions/hooks của bạn,
  chỉ thêm 1 SessionStart hook); `CLAUDE.md` chỉ cập nhật phần giữa 2 marker `sdlc-workflow`,
  không đụng nội dung khác của bạn.
- **Update idempotent.** Chạy lại lệnh sau khi repo có bản mới: file bạn **chưa sửa** được
  cập nhật tự động; file bạn **đã chỉnh tay** sẽ được hỏi
  (`--on-conflict ask|overwrite|skip|backup`, mặc định hỏi từng file khi có bàn phím).
  Installer theo dõi qua `.claude/.sdlc-install.json` (checksum lúc cài) để biết file nào bạn đã đổi.
- **Backup được.** `--on-conflict backup` giữ bản cũ thành `*.bak` trước khi ghi đè.

> **Repo private:** đặt `GITHUB_TOKEN` trong môi trường trước khi chạy, hoặc dùng
> `GITHUB_TOKEN=xxx npx github:hoangkhoanguyen/claude-tools`.

### Cách 2 — plugin đọc trực tiếp (không copy file, update bằng `git pull`)

Clone repo 1 lần rồi trỏ Claude Code vào:

```bash
claude --plugin-dir /đường/dẫn/tới/claude-tools
```

Hoặc thêm vào `.claude/settings.json` của dự án (copy từ `templates/project-settings.json`):

```json
{
  "pluginDirs": ["/đường/dẫn/tới/claude-tools"]
}
```

Cách này **không đụng gì** vào `.claude/` của dự án; muốn cập nhật chỉ cần `git pull` trong repo đã clone.

Sau đó các slash command `/sdlc:*` sẽ khả dụng trong mọi session.

---

## Luồng làm việc

```
[Tài liệu business logic của bạn — plugin dùng làm ĐẦU VÀO, không tự sinh ra]
[Thiết kế UI (tùy chọn): DESIGN.md có sẵn / bản design ngoài đưa vào phase design / hoặc để plugin tự lo]
          │
          ▼
  /sdlc:sprint-plan          ← đọc tài liệu, chia thành các sprint
          │                     bạn review danh sách sprint + chốt tech stack mỗi sprint
          ▼
  /sdlc:run <sprint>         ← MỘT lệnh làm tất cả cho 1 sprint:
          │                     analyze → design → tasks → execute → test
          │                     (tự lưu state sau mỗi bước)
          ▼
  (hết limit / ngắt giữa chừng?)
  /sdlc:run <sprint>         ← chạy lại y lệnh cũ → tự đọc state, làm tiếp
          │
          ▼
  Bạn manual test            ← chỉ verify nghiệp vụ, không gặp lỗi vặt
```

Ngoài `run`, mỗi phase cũng có command riêng nếu bạn muốn chạy từng bước:
`/sdlc:analyze`, `/sdlc:design`, `/sdlc:tasks`, `/sdlc:execute`, `/sdlc:test`.

`/sdlc:tasks` chỉ tạo tài liệu (chia task, không code) và sinh `commands.md` liệt kê lệnh chạy.
Muốn thực thi thủ công một task: `/sdlc:task <version> <sprint> <task-id>`; chạy tuần tự cả sprint:
`/sdlc:execute <version> <sprint>`.

`/sdlc:status` để xem tiến độ bất cứ lúc nào. `/sdlc:replan` để cập nhật sprint khi business logic đổi
giữa chừng mà không mất state.

---

## State lưu ở đâu

Plugin ghi mọi thứ vào thư mục `.sdlc/` trong dự án của bạn (commit được để team thấy & resume):

```
.sdlc/
├── sprints.md               ← danh sách sprint + tech stack + dependency + trạng thái
├── architecture.md          ← kiến trúc nền tảng xuyên sprint (mọi sprint tham chiếu)
├── design-system.md         ← design tokens xuyên sprint (khi có UI — từ DESIGN.md, bản ngoài, hoặc suy ra)
├── state.md                 ← con trỏ resume (schema cố định — xem templates/state.template.md)
└── <sprint-slug>/
    ├── requirements.md      ← output analyze (gồm NFR + regression impact)
    ├── design.md            ← output design hệ thống (bảng mapping RULE/EC/NFR)
    ├── ui-design.input.md   ← (tùy chọn) bản design từ ngoài đưa vào — ui-designer ingest thành ui-design.md
    ├── ui-design.md         ← output design giao diện (tokens, component spec, Design AC) — nếu có UI
    ├── tasks.md             ← task list + status (todo/doing/done)
    ├── test-report.md       ← kết quả test + việc cần bạn verify tay
    └── visual-baseline/     ← screenshot baseline cho visual regression — nếu có UI
```

> Định dạng file (md/json/...) do agent chọn cho phù hợp — không cố định. Riêng `state.md` theo schema cố
> định (`templates/state.template.md`) để resume đáng tin cậy.

---

## Thành phần

| Loại | Tên | Vai trò |
|------|-----|---------|
| Command | `sprint-plan` | Chia sprint + tạo architecture.md nền tảng |
| Command | `run` | Chạy trọn 1 sprint, resume được |
| Command | `analyze` / `design` / `tasks` / `execute` / `test` | Chạy từng phase riêng lẻ |
| Command | `status` | Xem tiến độ |
| Command | `replan` | Cập nhật sprint khi business logic đổi, giữ state |
| Agent | `product-analyst` | Requirements → user stories, AC, business rules, edge cases, NFR, regression |
| Agent | `architect` | System design: API, DB, architecture, UI flow, NFR, regression-safe |
| Agent | `feature-builder` | Implement từng task (+ git commit mỗi task) |
| Agent | `test-strategist` | Chọn chiến lược test theo stack + viết/chạy test |
| Agent | `qa-guard` | Soát lỗi vặt + regression + NFR, xác nhận sạch trước bàn giao |
| Agent | `ui-designer` | Nguồn thiết kế (bản ngoài / DESIGN.md / app cũ / hỏi user) → tokens, component spec, Design AC (khi có UI) |
| Agent | `reviewer` | Kiểm chéo độc lập output analyze/design/ui-design so với đầu vào |
| Skill | `requirements-analysis` | Chuẩn output của analyze |
| Skill | `system-design` | Chuẩn output của design |
| Skill | `task-breakdown` | Cách chia task đúng, không sót AC |
| Skill | `test-strategy` | Bảng quyết định test theo loại feature |
| Skill | `design-fidelity` | Đối chiếu UI với DESIGN.md: token, contrast, responsive, dark/light |
| Skill | `self-review` | Checklist tự soi lại sau mỗi phase |
| Hook | `SessionStart` | In tiến trình SDLC đang dở khi mở session (hỗ trợ resume) |

---

## Dự án có UI — nguồn thiết kế đến từ đâu cũng được

Khi sprint có màn hình, UI là "requirement" ngang hàng nghiệp vụ. Phase design chạy 2 nhánh song song:
`architect` (hệ thống: API, DB) + `ui-designer` (giao diện). ui-designer **không tự chế thẩm mỹ** — nó
xác định nguồn thiết kế **theo từng màn hình** (bên ngoài cấp được bao nhiêu dùng bấy nhiêu, phần thiếu tự xử):

| Tình huống | ui-designer làm gì |
|---|---|
| Có bản design ngoài (`.sdlc/<sprint>/ui-design.input.md` — từ Claude Design / designer) | **Ingest + chuẩn hóa** thành `ui-design.md` (thêm Design AC/state/token nếu bản ngoài thiếu). Nguồn `external` |
| Bản ngoài chỉ cấp một phần màn | Màn có → ingest; màn thiếu → **tự sinh** bám tokens của phần external. Nguồn `mixed` |
| Có `DESIGN.md` / design system | Tự sinh spec từ đó. Nguồn `internal` |
| **Dự án CŨ** (đã có UI chạy được), không DESIGN.md | Bám phong cách app hiện có — không hỏi, không đổi style |
| **Dự án MỚI**, không nguồn nào | Hỏi bạn 1 lần (có DESIGN.md? / mô tả phong cách / để Claude tự quyết) → **sinh `DESIGN.md`** làm nguồn xuyên sprint |

- **Design tokens chuẩn hóa** vào `.sdlc/design-system.md` (xuyên sprint). Execute build UI qua token,
  KHÔNG hardcode màu/spacing/font. Mỗi màn đánh dấu `[external]`/`[generated]` để biết phần nào cần đối chiếu mockup gốc.
- **Phase test có visual verification**: Playwright chụp screenshot đối chiếu Design AC + baseline →
  bắt "lệch màu / vỡ layout / mất tương phản" tự động.
- **qa-guard có design fidelity check** trước khi bàn giao.

→ Kết quả: khi manual test, bạn CHỈ xét *trải nghiệm/thẩm mỹ tổng thể*, không phải soi *đúng thiết kế chưa*.

Nếu sprint không có màn hình nào, nhánh này tự tắt.

## Nguyên tắc "không lỗi vặt khi manual test"

Trước khi báo sprint xong, `qa-guard` đảm bảo:

- Mọi task đã pass test của nó (không đợi cuối mới test)
- API endpoints đã smoke test (không có 500 / call lỗi)
- Không unhandled exception, không hardcode credential, không TODO sót
- Mọi edge case đã-define trong requirements đều có handling + test
- Đi hết happy path của từng user story không vấp lỗi

→ Report cuối phân rõ 3 nhóm: **đã tự động cover** / **cần bạn verify tay** / **edge case chưa define** (nếu có).
