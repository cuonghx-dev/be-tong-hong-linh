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

Tài liệu nền: **`docs/tech.md`** (stack + quy tắc), **`docs/design.md`** (bố cục UI: App shell, Table layout §3, Record page §5). Spec nghiệp vụ gốc ở `docs/misa-specs/`; comment trong code tham chiếu theo `§<số>` của các spec này — đọc spec tương ứng khi sửa 1 nghiệp vụ.

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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ke-toan-SME** (4410 symbols, 11539 relationships, 148 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/ke-toan-SME/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ke-toan-SME/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ke-toan-SME/clusters` | All functional areas |
| `gitnexus://repo/ke-toan-SME/processes` | All execution flows |
| `gitnexus://repo/ke-toan-SME/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
