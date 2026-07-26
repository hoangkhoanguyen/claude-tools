---
name: design-fidelity
description: Checklist và cách đối chiếu giao diện đã implement với định hướng thiết kế (DESIGN.md / design-system.md) — design tokens, contrast/accessibility, responsive, dark/light, spacing/typography. Dùng ở phase execute (khi build UI) và test/qa (visual verification) cho dự án có yếu tố thiết kế thị giác.
---

# Design Fidelity

Kỹ năng đảm bảo giao diện build ra KHỚP thiết kế, để khi user manual test không gặp "lệch pixel / sai màu /
vỡ layout" — chỉ còn xét trải nghiệm.

## Khi nào dùng

Chỉ khi dự án có định hướng thẩm mỹ: có `DESIGN.md`, hoặc `.sdlc/design-system.md`, hoặc design system rõ
trong codebase. Không có → bỏ qua, UI bám convention codebase.

## Nguyên tắc build khớp thiết kế (execute)

- Mọi giá trị thị giác qua **design token**, KHÔNG hardcode màu/spacing/font/radius.
- Reuse component có sẵn trước khi tạo mới.
- Implement đủ MỌI state đã spec: default/hover/active/disabled/loading/empty/error.
- Responsive theo breakpoint trong tokens; kiểm cả dark & light nếu dự án hỗ trợ.

## Checklist đối chiếu (test / qa) — mỗi màn hình

- [ ] **Token đúng**: màu/typography/spacing/radius/shadow khớp `design-system.md` (không giá trị lạ).
- [ ] **Contrast / a11y**: tỉ lệ tương phản text/nền đạt ngưỡng (≥ 4.5:1 text thường); có focus state;
      ảnh có alt; control có label/role.
- [ ] **Responsive**: không vỡ layout ở breakpoint nhỏ nhất và lớn nhất đã định.
- [ ] **Dark/Light**: cả hai chế độ đúng token, không chữ chìm/mất tương phản.
- [ ] **State đầy đủ**: empty/loading/error hiển thị đúng, không màn hình trắng/khựng.
- [ ] **Design AC**: mọi `DAC-xx` trong ui-design.md đã đạt.

## Visual verification bằng Playwright

- Chụp screenshot mỗi màn hình/state chính ở các breakpoint + dark/light.
- Đối chiếu với Design AC (mã màu qua computed style, layout không tràn/overlap).
- Nếu có baseline trước (`.sdlc/<sprint>/visual-baseline/`): so sánh phát hiện regression thị giác.
  Lần đầu chưa có baseline → tạo baseline sau khi đã xác nhận khớp Design AC.
- Playwright đã cài sẵn trong môi trường; KHÔNG chạy `playwright install`.

## Ranh giới với NFR-accessibility

Nếu requirements đã có NFR về a11y, phần contrast/focus/label ở đây chính là cách kiểm NFR đó — không làm
trùng, coi design-fidelity là nơi thực thi kiểm a11y cho UI.
