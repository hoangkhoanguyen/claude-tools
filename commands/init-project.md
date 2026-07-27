---
description: Nhận file tech stack đã soạn sẵn → init các app còn thiếu trong monorepo → viết CLAUDE.md cho root và từng app.
argument-hint: [đường dẫn file tech stack]
---

# /init-project

Nhận file tech stack đã soạn sẵn → init các app còn thiếu trong monorepo → viết CLAUDE.md cho root và từng app.
Chạy tự động hết 2 bước, không hỏi thêm sau khi bắt đầu.

## Bước 0 — Tìm file tech stack

Nếu user cung cấp path khi gọi lệnh → đọc file đó.

Nếu không có path, tìm theo thứ tự ưu tiên:
1. `.sdlc/versions.md`
2. `.sdlc/architecture.md`
3. `TECH_STACK.md`, `STACK.md`, `tech-stack.md` ở root
4. Glob `.sdlc/**/*.md` → đọc file có từ khoá "tech", "stack", "architecture", "framework"
5. `CLAUDE.md` ở root nếu có section tech stack

Extract từ file tìm được:
- Danh sách apps/services (tên, loại, framework, port)
- Packages/libraries chính cho từng app
- Monorepo tooling (pnpm workspaces, turborepo...)
- Database, external services

Nếu không tìm được file nào → báo user và dừng.

## Bước 1 — Init codebase

### Kiểm tra trạng thái

Với mỗi app trong tech stack:
- Đã có `package.json` → skip
- Chưa có hoặc thư mục rỗng → cần init

Với root monorepo:
- `pnpm-workspace.yaml`, `package.json` root, `turbo.json` đã có chưa

### Init theo đúng thứ tự

**Thứ tự:** root setup → shared packages → apps

**Root (nếu chưa có):**
- Tạo `package.json` root với `pnpm init`
- Tạo `pnpm-workspace.yaml` với globs `apps/*` và `packages/*`
- Tạo `turbo.json` nếu tech stack chỉ định dùng Turborepo

**Init từng app — dùng đúng CLI:**

| Framework | Lệnh |
|---|---|
| Next.js | `pnpm create next-app@latest apps/[name] --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git` |
| NestJS | `pnpm dlx @nestjs/cli new apps/[name] --package-manager pnpm --skip-git` |
| Vite + React | `pnpm create vite apps/[name] --template react-ts` |
| Remix | `pnpm create remix apps/[name] --no-git-init` |
| Express/Fastify | Tạo thủ công: `mkdir -p apps/[name]/src`, `pnpm init`, cài deps |
| Shared package | `mkdir -p packages/[name]/src`, `pnpm init`, cài deps phù hợp |
| Prisma package | `pnpm init` + `pnpm add prisma @prisma/client` + `pnpm dlx prisma init` |

Sau khi init:
- Xoá `.git` folder nếu CLI tạo trong app con
- Cài thêm dependencies chính được chỉ định trong tech stack
- Thêm workspace reference (`"@repo/[name]": "workspace:*"`) vào app nào dùng shared package

### Báo cáo bước 1
```
✓ Init: apps/web (Next.js 14)
✓ Init: apps/api (NestJS 10)
✓ Init: packages/ui
→ Skip: packages/db (đã tồn tại)
```

## Bước 2 — Viết CLAUDE.md

### Đọc cấu trúc thực tế trước khi viết

Đọc lại sau khi init xong:
- Folder structure thực tế của từng app
- `package.json` thực tế (CLI có thể thêm/bỏ package)
- Config files (`tsconfig.json`, framework config, `.env.example`)
- Path aliases đã được setup

### Persona

Đóng vai **senior developer** am hiểu sâu toàn bộ tech stack của dự án này.
Viết rules dựa trên kiến thức thực tế về framework — không chung chung, phải đủ cụ thể để agent đọc vào biết ngay phải làm gì và không được làm gì.

### Root CLAUDE.md

```markdown
# [Tên repo]

## Workspace overview
| App/Package | Vai trò | Tech chính | Port |
|---|---|---|---|
[Điền từ tech stack thực tế]

## Shared packages
[Danh sách packages/* và mục đích, cách import]

## Lệnh pnpm
[Lấy từ scripts thực tế trong package.json — không bịa]

## Nguyên tắc chung
- Tận dụng built-in của framework/library; extend nếu cần; chỉ tự viết khi thực sự không có
- Shared logic → packages/, không duplicate giữa các apps
- Không thêm package mới khi workspace đã có thứ đủ dùng
- Config tập trung tại một chỗ, không hardcode rải rác

## Convention
[Từ config thực tế: ESLint, Prettier, TypeScript, commit convention nếu có]
```

### App CLAUDE.md

Với mỗi app, viết `[app-path]/CLAUDE.md`:

```markdown
# [Tên app]

[Một dòng mô tả app làm gì]

## Lệnh
[Từ scripts thực tế — bao gồm cách chạy từ root và từ thư mục app]

## Tech stack
[Danh sách tech chính với version thực tế]

## Cấu trúc thư mục
[Folder structure thực tế, vai trò từng thư mục]

## [Framework] — Cách dùng đúng
[Rules cụ thể theo framework — xem hướng dẫn bên dưới]

## Anti-patterns — Không làm
[Những gì agent hay sai với framework này — phải cụ thể, không chung chung]

## Shared packages đang dùng
[packages/* nào, import path thực tế]

## Env vars
[Từ .env.example nếu có]
```

### Framework rules — viết thế nào cho đúng

Mỗi rule phải trả lời được: *"Nếu không ghi điều này, agent có tự làm đúng không?"*
Nếu câu trả lời là "không chắc" → ghi. Nếu là "chắc chắn đúng" → bỏ qua.

**Ví dụ xấu** (quá chung):
```
Dùng React Query để fetch data
```

**Ví dụ tốt** (cụ thể, actionable):
```
## Data fetching — flow bắt buộc
src/api/[resource].ts     → hàm gọi API thuần (axios, không hook)
src/hooks/use[Resource].ts → wrap useQuery/useMutation
Component                  → chỉ gọi hook, không fetch trực tiếp

Anti-pattern:
- useEffect + fetch trong component
- Gọi axios trực tiếp trong component
- Tạo axios instance mới ngoài src/api/
```

**Rules theo framework phổ biến:**

*React + TanStack Query:*
- Flow: api function → useQuery hook → component (không shortcut)
- Mutations: useMutation + invalidateQueries, không tự refetch
- Server data vs UI state: React Query cho server data, useState/Zustand cho UI state

*Next.js App Router:*
- Server Component fetch trực tiếp (async/await), không useEffect
- `use client` chỉ khi cần: event handlers, browser APIs, stateful UI
- next/image thay img, next/link thay a, next/font thay CDN font
- Env vars client-side phải có prefix NEXT_PUBLIC_

*NestJS:*
- Tạo module/service/controller bằng CLI (`nest g module`, `nest g service`...), không viết tay
- Validate bằng class-validator + ValidationPipe, không validate thủ công trong controller
- Inject qua constructor, không new service thủ công
- Auth → Guard, không check token trong service/controller

*Prisma:*
- Singleton PrismaClient, không new PrismaClient() trong từng file
- Dùng prisma migrate dev khi sửa schema, không sửa migration file đã commit
- Prisma.$transaction() cho operations cần atomic

*tRPC:*
- Định nghĩa router tập trung, export appRouter duy nhất
- Không gọi procedure trực tiếp từ server khác — dùng server-side caller
- Input validation bằng Zod schema trong procedure definition

*Zustand:*
- Một store per domain, không một store global khổng lồ
- Actions trong store, không define ngoài
- Không store server data vào Zustand — dùng React Query

### Merge nếu file đã tồn tại

Nếu CLAUDE.md đã có nội dung → merge: giữ nội dung cũ còn giá trị, bổ sung section còn thiếu, cập nhật section lỗi thời. Không overwrite toàn bộ.

### Làm mới bản chưng cất context

Lệnh này tạo/sửa `CLAUDE.md` → mọi `.sdlc/*/context.md` đã có đều **stale**. Với mỗi file đó, đặt
`context_digest: stale` trong `.sdlc/<version>/state.md`. Lệnh `/sdlc:*` chạy sau sẽ tự đối chiếu
fingerprint và chưng cất lại — không cần làm ngay tại đây.

## Báo cáo cuối

```
Bước 1 — Codebase:
  ✓ Init: apps/web (Next.js 14 App Router)
  ✓ Init: apps/api (NestJS 10)
  ✓ Init: packages/ui
  → Skip: packages/db (đã tồn tại)

Bước 2 — CLAUDE.md:
  ✓ CLAUDE.md (root)
  ✓ apps/web/CLAUDE.md
  ✓ apps/api/CLAUDE.md
  ✓ packages/ui/CLAUDE.md

Cần bổ sung thủ công:
  [Liệt kê nếu có thông tin không detect được từ config]
```
