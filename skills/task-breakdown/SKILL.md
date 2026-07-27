---
name: task-breakdown
description: Cách chia design của một sprint thành danh sách task thực thi được, có thứ tự phụ thuộc, checkpoint-able và resume-able, không bỏ sót AC nào. Dùng ở phase tasks trong SDLC trước khi execute.
---

# Task Breakdown

Kỹ năng biến `design.md` thành danh sách task để feature-builder thực thi tuần tự, mỗi task là một đơn
vị hoàn chỉnh có thể checkpoint (để resume khi bị ngắt).

## Nguyên tắc chia task

- **Mỗi task đủ nhỏ để hoàn thành + test trong một lần**, nhưng đủ lớn để là một đơn vị có nghĩa
  (vd "tạo endpoint POST /orders + validation", không phải "viết 1 dòng if").
- **Task độc lập chạy song song được** thì đánh dấu để execute tận dụng subagent song song.
- **Task có phụ thuộc** thì ghi rõ thứ tự (task B cần task A xong trước).
- **Mỗi task trỏ về**: story/AC nó phục vụ, phần design liên quan, file dự kiến đụng tới, EC cần handle.

## Không bỏ sót AC

Mỗi `AC-xx`, `EC-xx`, `NFR-xx` trong requirements — và `DAC-xx` trong ui-design (nếu có UI) — phải được ít
nhất một task phụ trách. Kèm bảng **AC/EC/NFR/DAC → task** để chứng minh phủ đủ. Đây là chốt chặn: thiếu
ánh xạ = sẽ có tính năng/thiết kế không được build. Cân nhắc tách task UI và task hệ thống để chạy song song.

## Trạng thái task (để resume)

Mỗi task có status: `todo` / `doing` / `done` (+ `blocked` kèm lý do nếu có). Ghi vào
`.sdlc/<sprint>/tasks.md`. Khi execute, đồng bộ với TodoWrite trong session; cập nhật file sau mỗi task
để lần chạy sau biết chỗ tiếp tục.

## Mẫu một task

```
- [ ] TASK-03  (todo)
  Mô tả: Tạo endpoint POST /orders với validation stock
  Phục vụ: Story-02 (AC-02.1, AC-02.2), EC-01, EC-04
  Design ref: API Contracts §POST /orders, Data Model §Order
  File dự kiến: src/routes/orders.ts, src/services/order.ts
  Phụ thuộc: TASK-01 (Order schema)
  Skill gợi ý: <tên skill nếu có — vd migration, component-gen, e2e-test; để trống nếu không>
  Test: unit cho service + smoke POST endpoint
```

Trường `Skill gợi ý`: điền tên skill của dự án (trong `.claude/skills/`, plugin, hoặc built-in) mà
task này nên dùng. Căn cứ vào loại việc (migration DB → skill migration; sinh component → skill
component-gen; test E2E → skill e2e; ...). Để trống nếu không có skill nào phù hợp hơn cách mặc định.
Đây là gợi ý cho feature-builder — không bắt buộc dùng nếu skill không khớp thực tế.

## Checklist tự soi trước khi chốt

- [ ] Mọi AC-xx / EC-xx có ít nhất một task phụ trách (có bảng mapping)?
- [ ] Task nào chạy song song được đã đánh dấu?
- [ ] Phụ thuộc giữa task đã ghi đúng thứ tự?
- [ ] Mỗi task có tiêu chí test rõ để mark done?
