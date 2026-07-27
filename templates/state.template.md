<!--
  SCHEMA state.md — con trỏ tiến trình SDLC. Đặt tại .sdlc/<version>/state.md trong dự án.
  Agent PHẢI giữ ĐÚNG cấu trúc này (các key, thứ tự) để resume đáng tin cậy.
  Cập nhật sau MỖI phase và MỖI task. Giá trị trong <...> là placeholder.
-->

# SDLC State

- **version**: <version-slug>                 # vd: v1, v2, phase-2
- **current_sprint**: <sprint-slug | none>
- **current_phase**: <analyze | design | tasks | execute | test | qa | done | none>
- **current_task**: <TASK-id | none>          # chỉ có nghĩa khi phase = execute
- **updated_at**: <YYYY-MM-DD HH:MM>

## Phase status (sprint hiện tại)

- analyze:       <todo | doing | done>
- design_system: <todo | doing | done>              # nhánh architect
- design_ui:     <todo | doing | waiting-external | done | n/a>   # nhánh ui-designer; waiting-external = chờ bản design ngoài đưa vào; n/a nếu SPRINT không có màn hình nào
- tasks:         <todo | doing | done>
- execute:       <todo | doing | done>
- test:          <todo | doing | done>
- qa:            <todo | doing | done>

## Human approval gates

- analyze_approved:  <pending | true>   # true khi user đã xác nhận requirements trước khi Design
- design_approved:   <pending | true>   # true khi user đã xác nhận design trước khi Tasks
- tasks_approved:    <pending | true>   # true khi user đã xác nhận task list trước khi Execute

## Con trỏ resume

- **next_action**: <mô tả 1 dòng bước tiếp theo cần làm khi resume>
- **blockers**: <none | mô tả blocker + việc cần user làm>

## Context (chi tiết nằm ở .sdlc/<version>/context.md — đừng chép lại vào đây)

- context_digest: <ok | stale | missing>   # ok = fingerprint trong context.md còn khớp repo
- context_checked_at: <YYYY-MM-DD HH:MM>   # lần cuối lệnh cha đối chiếu fingerprint
- services_up: <service ngoài đã xác nhận đang chạy>
- has_design: <yes | no>                            # dự án có DESIGN.md / design system không
- ui_design_source: <internal | external | mixed | none>   # internal = workflow tự sinh toàn bộ; external = 100% màn từ bản ngoài (input tại .sdlc/<version>/<sprint>/ui-design.input.md); mixed = bản ngoài cấp một phần, màn thiếu workflow tự sinh; none = sprint không có UI
