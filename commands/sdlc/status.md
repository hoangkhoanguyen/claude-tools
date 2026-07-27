---
description: Xem tiến độ SDLC tổng thể — version nào đang làm, sprint nào xong/đang làm/chưa làm, phase và task hiện tại. Đọc từ .sdlc/.
---

# /sdlc:status

Hiển thị tiến độ hiện tại của dự án. Không thay đổi gì, chỉ đọc.

## Các bước

1. Đọc `.sdlc/versions.md` → danh sách versions và trạng thái từng version.
2. Với mỗi version, đọc `.sdlc/<version>/sprints.md` → trạng thái từng sprint.
3. Đọc `.sdlc/<version>/state.md` của version đang active → sprint hiện tại, phase đang ở, task đang dở.
4. Với sprint đang làm, đọc `.sdlc/<version>/<sprint>/tasks.md` → đếm task todo/doing/done.

## Trình bày

```
📊 SDLC Status

Versions:
  ✅ v1   done        (sprint-1-auth, sprint-2-orders, sprint-3-reports)
  🔄 v2   in-progress → sprint-1-upgrade › phase: execute (task 3/5)
  ⬜ v3   planned

Version active: v2
  Sprint: sprint-1-upgrade
  Phase:  execute
  Tasks:  3 done, 1 doing, 1 todo
  Đang làm: TASK-03 (tạo endpoint POST /upgrade)

▶ Resume:
  /sdlc:run v2 sprint-1-upgrade
  └─ Sẽ tiếp tục từ: execute › TASK-03
```

Nếu version đang làm đã xong hết sprint, gợi ý:

```
▶ Bắt đầu sprint tiếp theo trong v2:
  /sdlc:run v2 sprint-2-...

▶ Hoặc bắt đầu version mới:
  /sdlc:sprint-plan v3 <tài liệu>
```

Nếu chưa có `.sdlc/`, gợi ý chạy `/sdlc:sprint-plan v1 <tài liệu>` trước.
