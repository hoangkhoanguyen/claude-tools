---
description: Xem tiến độ SDLC tổng thể — sprint nào xong/đang làm/chưa làm, phase và task hiện tại, việc còn lại. Đọc từ .sdlc/.
---

# /sdlc:status

Hiển thị tiến độ hiện tại của dự án. Không thay đổi gì, chỉ đọc.

## Các bước

1. Đọc `.sdlc/sprints.md` → trạng thái từng sprint (planned / in-progress / done).
2. Đọc `.sdlc/state.md` → sprint hiện tại, phase đang ở, task đang dở.
3. Với sprint đang làm, đọc `.sdlc/<sprint>/tasks.md` → đếm task todo/doing/done.

## Trình bày

```
📊 SDLC Status

Sprints:
  ✅ sprint-1-auth       done
  🔄 sprint-2-orders     in-progress  → phase: execute (task 3/7)
  ⬜ sprint-3-reports    planned

Sprint hiện tại: sprint-2-orders
  Phase: execute
  Tasks: 3 done, 1 doing, 3 todo
  Đang làm: TASK-04 (tạo endpoint GET /orders)

▶ Resume:
  /sdlc:run sprint-2-orders
  └─ Sẽ tiếp tục từ: execute › TASK-04 (tạo endpoint GET /orders)
```

Nếu chưa có sprint nào đang dở, in thêm sprint tiếp theo có thể bắt đầu:

```
▶ Bắt đầu sprint tiếp theo:
  /sdlc:run sprint-3-reports
```

Nếu chưa có `.sdlc/`, gợi ý chạy `/sdlc:sprint-plan` trước.
