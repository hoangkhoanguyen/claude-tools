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

## Cài đặt (dùng như plugin cho dự án khác)

Trong dự án bất kỳ, chạy Claude Code với:

```bash
claude --plugin-dir /đường/dẫn/tới/claude-tools
```

Hoặc thêm vào `.claude/settings.json` của dự án (copy từ `templates/project-settings.json`):

```json
{
  "pluginDirs": ["/đường/dẫn/tới/claude-tools"]
}
```

Sau đó các slash command `/sdlc:*` sẽ khả dụng trong mọi session.

---

## Luồng làm việc

```
[Tài liệu business logic của bạn — plugin dùng làm ĐẦU VÀO, không tự sinh ra]
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

`/sdlc:status` để xem tiến độ bất cứ lúc nào. `/sdlc:replan` để cập nhật sprint khi business logic đổi
giữa chừng mà không mất state.

---

## State lưu ở đâu

Plugin ghi mọi thứ vào thư mục `.sdlc/` trong dự án của bạn (commit được để team thấy & resume):

```
.sdlc/
├── sprints.md               ← danh sách sprint + tech stack + dependency + trạng thái
├── architecture.md          ← kiến trúc nền tảng xuyên sprint (mọi sprint tham chiếu)
├── state.md                 ← con trỏ resume (schema cố định — xem templates/state.template.md)
└── <sprint-slug>/
    ├── requirements.md      ← output analyze (gồm NFR + regression impact)
    ├── design.md            ← output design (bảng mapping RULE/EC/NFR)
    ├── tasks.md             ← task list + status (todo/doing/done)
    └── test-report.md       ← kết quả test + việc cần bạn verify tay
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
| Agent | `reviewer` | Kiểm chéo độc lập output analyze/design so với đầu vào |
| Skill | `requirements-analysis` | Chuẩn output của analyze |
| Skill | `system-design` | Chuẩn output của design |
| Skill | `task-breakdown` | Cách chia task đúng, không sót AC |
| Skill | `test-strategy` | Bảng quyết định test theo loại feature |
| Skill | `self-review` | Checklist tự soi lại sau mỗi phase |
| Hook | `SessionStart` | In tiến trình SDLC đang dở khi mở session (hỗ trợ resume) |

---

## Nguyên tắc "không lỗi vặt khi manual test"

Trước khi báo sprint xong, `qa-guard` đảm bảo:

- Mọi task đã pass test của nó (không đợi cuối mới test)
- API endpoints đã smoke test (không có 500 / call lỗi)
- Không unhandled exception, không hardcode credential, không TODO sót
- Mọi edge case đã-define trong requirements đều có handling + test
- Đi hết happy path của từng user story không vấp lỗi

→ Report cuối phân rõ 3 nhóm: **đã tự động cover** / **cần bạn verify tay** / **edge case chưa define** (nếu có).
