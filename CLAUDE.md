# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Phần mềm kế toán online cho doanh nghiệp vừa và nhỏ (SME). Domain và UI tiếng Việt; giữ nguyên ngôn ngữ đó trong code, comment, và chuỗi hiển thị.

## Lệnh

Monorepo pnpm 9 + Turborepo, Node ≥ 20. Chạy từ **root** (turbo fan-out mọi app):

```bash
pnpm install
pnpm docker:up            # Postgres + Redis (bắt buộc trước khi chạy api)
pnpm dev                  # web (Vite :5173) + api (Nest :3000) song song
pnpm build | lint | typecheck | test | format
```

Theo từng app (`--filter`):

```bash
pnpm --filter @app/api dev            # nest start --watch
pnpm --filter @app/api prisma:generate
pnpm --filter @app/api prisma:migrate # sau khi sửa schema.prisma
pnpm --filter @app/api prisma:studio
pnpm --filter @app/api seed           # node prisma/seed.mjs
pnpm --filter @app/web dev
```

- Swagger: http://localhost:3000/api/docs (mọi route có prefix `/api`)
- **Test**: Jest (`jest --passWithNoTests` — chưa có test nào). Chạy 1 test: `pnpm --filter @app/api test -- <pattern>`. Web chưa cấu hình test.
- `lint` = `eslint --fix`; `packages/shared` phải `build` (tsc) trước khi api/web typecheck vì chúng import `dist`.

## Kiến trúc

Ba workspace, feature-based, đối xứng FE ↔ BE:

- `apps/web` — React 18 + Vite + TS. SPA, TanStack Query (server state) + Zustand (client state), React Hook Form + Zod, TanStack Table, Tailwind. Alias `@/` → `apps/web/src`.
- `apps/api` — NestJS 10 + Prisma (Postgres). 1 module = 1 nghiệp vụ.
- `packages/shared` (`@app/shared`) — enum/DTO type/constant dùng chung FE ↔ BE.

Tài liệu nền: **`docs/tech.md`** (stack + quy tắc), **`docs/design.md`** (bố cục UI: App shell, Table layout §3, Record page §5). Spec nghiệp vụ gốc ở `docs/misa-specs/` và `docs/specs/`; comment trong code tham chiếu theo `§<số>` của các spec này — đọc spec tương ứng khi sửa 1 nghiệp vụ.

### Ranh giới feature (quan trọng)

Mỗi nghiệp vụ là 1 slice tự chứa. **Feature không import chéo file nội bộ của nhau** — đi qua `shared/` hoặc public API (`index.ts`) của feature khác.

- Web: `apps/web/src/features/<x>/` với `api/` (query keys + hooks), `components/`, `pages/`, `schema.ts` (Zod), `types.ts`, `index.ts` (public API).
- API: `apps/api/src/modules/<x>/` với `<x>.module.ts`, controller(s), service(s), `dto/`.

### Trạng thái thực tế vs. spec

Docs mô tả nhiều nghiệp vụ hơn phần đã build. **Đã wire trong `app.module.ts`**: `cash`, `bank`, `purchase`, `sales`. `auth`, `catalog`, `inventory`, `report` mới là thư mục placeholder (`.gitkeep`). Đừng cho rằng 1 module tồn tại chỉ vì docs nhắc tới — kiểm tra `app.module.ts`.

**Auth hiện là mock**: `features/auth/store.ts` là Zustand persist, `shared/lib/api.ts` chưa gắn token/refresh (còn TODO). Đừng dựa vào auth thật cho tới khi backend `auth` được build.

## Quy ước nghiệp vụ kế toán

Đây là phần dễ sai nhất — bám theo pattern có sẵn trong `cash`/`bank`/`purchase`/`sales`:

- **Bút toán kép**: mỗi chứng từ = 1 header + nhiều `*VoucherLine`, mỗi dòng có `debitAccount`/`creditAccount` (mã TK) + `amount`. Loại nghiệp vụ (`*Category` enum) quyết định TK định khoản mặc định — xem comment `§5` trong `packages/shared/src/enums`.
- **Tiền tệ**: dùng `Prisma.Decimal` (cột `NUMERIC`), KHÔNG float. DTO trả về serialize `.toString()`. FE format phân cách nghìn khi hiển thị, lưu raw number.
- **Mã tài khoản**: hằng số ở `packages/shared/src/constants` (`CHART_OF_ACCOUNTS`, theo TT 133/200) — không hardcode chuỗi mã TK rải rác.
- **Ghi dữ liệu bọc `$transaction`** (xem `CashService.create/update`): update line = xóa hết line cũ rồi tạo lại + tính lại `totalAmount`.
- **Số chứng từ tự tăng**: `MAX(seq trong năm) + 1`, KHÔNG dùng `count+1` (dữ liệu nhập khẩu có thể đứt quãng → count gây trùng). Xem `nextVoucherNo` trong `cash.service.ts`.
- **Nhập khẩu Excel** (`*-import.ts` + `importXlsx`): parse bằng `xlsx`, bỏ qua chứng từ trùng `voucherNo`, `createMany` theo lô 500. UI: nhập Excel là **1 mục trong `AddMenu`** (`shared/ui/add-menu.tsx`), KHÔNG tạo nút riêng — xem `docs/design.md §3.2.1`.

### Nguồn enum kép

Prisma tự khai enum trong `schema.prisma`; service import enum từ `@prisma/client`. DTO/type dùng chung import từ `@app/shared`. Khi thêm giá trị enum nghiệp vụ, cập nhật **cả hai** (`schema.prisma` + `packages/shared/src/enums`) rồi `prisma:generate` + `prisma:migrate`.

## UI patterns dùng chung

- **Chứng từ = trang full-page theo route** (không phải modal): `/{module}/vouchers/new|:id|:id/edit`, đè cả Sidebar/Header. Mode `new|edit|view` truyền qua prop; `view` = `fieldset disabled`. Xem `router.tsx` (`recordRoutes`) và `docs/design.md §5`.
- Primitive UI ở `apps/web/src/shared/ui/` (`AddMenu`, `RowActionMenu`, `Popover`, `PartnerPicker`, `ConfirmDialog`…) — tái dùng, đừng dựng lại.
- **Filter/phân trang bảng → URL search params** (share link, back/forward), KHÔNG lưu Zustand.
- Sau mutation ghi chứng từ, **invalidate mọi query liên quan** (danh sách + công nợ + tồn kho) vì 1 chứng từ ảnh hưởng nhiều bảng — xem pattern trong `features/*/api/use*Mutations.ts`.

## Git

Commit theo Conventional Commits, scope = tên phân hệ (`cash`, `bank`, `purchase`, `sales`, `web`). Branch: prefix `feature/` (KHÔNG `feat/`), `fix/`, `chore/`, `refactor/`, `docs/`.
