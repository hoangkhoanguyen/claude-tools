<!--
  SCHEMA state.md — con trỏ tiến trình SDLC. Đặt tại .sdlc/state.md trong dự án.
  Agent PHẢI giữ ĐÚNG cấu trúc này (các key, thứ tự) để resume đáng tin cậy.
  Cập nhật sau MỖI phase và MỖI task. Giá trị trong <...> là placeholder.
-->

# SDLC State

- **current_sprint**: <sprint-slug | none>
- **current_phase**: <analyze | design | tasks | execute | test | qa | done | none>
- **current_task**: <TASK-id | none>          # chỉ có nghĩa khi phase = execute
- **updated_at**: <YYYY-MM-DD HH:MM>

## Phase status (sprint hiện tại)

- analyze:       <todo | doing | done>
- design_system: <todo | doing | done>              # nhánh architect
- design_ui:     <todo | doing | waiting-external | done | n/a>   # nhánh ui-designer; waiting-external = chờ bản design từ Claude Design ngoài; n/a nếu dự án không có UI/DESIGN.md
- tasks:         <todo | doing | done>
- execute:       <todo | doing | done>
- test:          <todo | doing | done>
- qa:            <todo | doing | done>

## Con trỏ resume

- **next_action**: <mô tả 1 dòng bước tiếp theo cần làm khi resume>
- **blockers**: <none | mô tả blocker + việc cần user làm>

## Context đã nạp lần chạy này (để lần sau biết cần đọc lại gì)

- claude_md_relevant: <danh sách CLAUDE.md liên quan đã đọc>
- skills_used: <skill của repo đã phát hiện & dùng>
- services_up: <service ngoài đã xác nhận đang chạy>
- has_design: <yes | no>                            # dự án có DESIGN.md / design system không
- ui_design_source: <internal | external | mixed | none>   # internal = workflow tự sinh toàn bộ; external = 100% màn từ bản ngoài (input tại .sdlc/<sprint>/ui-design.input.md); mixed = bản ngoài cấp một phần, màn thiếu workflow tự sinh; none = sprint không có UI
