<!--
  SCHEMA context.md — bản chưng cất context dự án. Đặt tại .sdlc/<version>/context.md.

  MỤC ĐÍCH: mỗi subagent bắt đầu cold. Nếu agent nào cũng tự Glob toàn repo + đọc mọi CLAUDE.md
  thì một sprint 8 task (~15 agent) sẽ nạp lại cùng một context 15 lần. File này được LỆNH CHA
  tạo MỘT LẦN ở BƯỚC 0, rồi mọi subagent chỉ đọc nó.

  QUY TẮC:
  - Lệnh cha (run/analyze/design/tasks/execute/task/test/sprint-plan/replan) tạo & làm mới file này.
  - Subagent CHỈ ĐỌC file này. KHÔNG Glob toàn repo tìm CLAUDE.md.
  - Giữ ≤150 dòng. Đây là bản CHƯNG CẤT, không phải bản copy CLAUDE.md.
  - Chỉ ghi cái ẢNH HƯỞNG tới việc code/test. Bỏ phần lịch sử, giới thiệu, marketing.
  - Giá trị trong <...> là placeholder.
-->

# Project Context — <version-slug>

> Bản chưng cất context dự án cho SDLC. Mọi agent đọc file này thay vì quét lại repo.
> Làm mới bằng cách chạy lại bất kỳ lệnh `/sdlc:*` nào (BƯỚC 0 tự kiểm tra fingerprint).

## Fingerprint (để biết khi nào cần tạo lại)

<!-- Lệnh cha so bảng này với thực tế ở BƯỚC 0. Lệch → chưng cất lại. Khớp → dùng luôn, không quét repo. -->

| File nguồn | Bytes | Sửa lần cuối |
|---|---|---|
| CLAUDE.md | <bytes> | <YYYY-MM-DD HH:MM> |
| <path/to/module/CLAUDE.md> | <bytes> | <YYYY-MM-DD HH:MM> |

- **generated_at**: <YYYY-MM-DD HH:MM>
- **sources_scanned**: <danh sách file đã đọc để chưng cất: CLAUDE.md, AGENTS.md, .cursorrules, package.json, docker-compose.yml...>

## Stack & runtime

- **Ngôn ngữ / runtime**: <vd TypeScript, Node 20>
- **Framework chính**: <vd Next.js 15 App Router, NestJS, Django>
- **Database / storage**: <vd Postgres 16 + Prisma>
- **Package manager**: <npm | pnpm | yarn | bun | poetry | go mod ...>
- **Monorepo?**: <không | có — công cụ gì (turbo/nx/workspaces) + danh sách app>

## Lệnh chuẩn của dự án (COPY NGUYÊN VĂN, đừng đoán)

<!-- Lấy từ package.json scripts / Makefile / CLAUDE.md. Sai lệnh ở đây = mọi agent chạy sai. -->

- **build**: `<lệnh>`
- **test (toàn bộ)**: `<lệnh>`
- **test (một file/pattern)**: `<lệnh>`
- **lint**: `<lệnh>`
- **typecheck**: `<lệnh>`
- **dev server**: `<lệnh>` (port `<port>`)
- **migrate**: `<lệnh>` | `n/a`
- **seed**: `<lệnh>` | `n/a`

## Module map (thư mục → vai trò → CLAUDE.md phụ trách)

<!-- Đây là thứ thay thế việc Glob toàn repo. Liệt kê MỌI CLAUDE.md tìm được, kèm phạm vi của nó,
     để agent biết khi nào cần đọc thêm file gốc mà không phải quét lại. -->

| Thư mục | Vai trò | CLAUDE.md riêng | Tóm tắt quy tắc riêng |
|---|---|---|---|
| <src/api> | <REST endpoints> | <src/api/CLAUDE.md \| không> | <1 dòng — quy tắc khác biệt so với gốc> |
| <src/web> | <UI> | <không> | <—> |

## Convention BẮT BUỘC

<!-- Chỉ ghi quy tắc mà nếu vi phạm thì code bị reject. Mỗi dòng một quy tắc, không viết prose. -->

- CONV-01: <vd Không dùng `any` trong TypeScript>
- CONV-02: <vd Mọi endpoint trả error theo shape { code, message }>
- CONV-03: <vd Component đặt tại src/components/<Tên>/index.tsx, PascalCase>

## Cấm / ràng buộc

- <vd KHÔNG sửa file trong src/generated/ — sinh tự động>
- <vd KHÔNG gọi trực tiếp DB từ layer route, phải qua service>

## Skill / command / agent CỦA DỰ ÁN (phát hiện được)

<!-- Quét .claude/skills, .claude/agents, .claude/commands + pluginDirs MỘT LẦN tại đây,
     để feature-builder/test-strategist không phải quét lại mỗi lần spawn. -->

| Tên | Loại | Dùng khi |
|---|---|---|
| <tên-skill> | skill | <loại việc khớp> |

- Không có skill riêng → ghi `none`.

## Service ngoài (từ config dự án, không đoán)

| Service | Port | Lệnh khởi động | Nguồn suy ra |
|---|---|---|---|
| <postgres> | <5432> | `<docker compose up -d db>` | <docker-compose.yml> |

## Ghi chú cho agent

- Cần chi tiết ngoài phạm vi file này → đọc ĐÚNG file trong "Module map", không quét lại toàn repo.
- Thấy file này mâu thuẫn với code thực tế → báo về lệnh cha để chưng cất lại, đừng tự sửa file này.
