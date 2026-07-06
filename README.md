# Kế toán SME

Phần mềm kế toán online cho doanh nghiệp vừa và nhỏ. Monorepo pnpm + Turborepo.

Kiến trúc & lý do chọn stack: xem [docs/tech.md](docs/tech.md).

## Cấu trúc

```
apps/
  web/        # ReactJS (Vite, TS) — SPA, feature-based
  api/        # NestJS (TS) — module theo nghiệp vụ, Prisma
packages/
  shared/     # type/enum/constant dùng chung FE ↔ BE (@app/shared)
```

## Yêu cầu

- Node >= 20
- pnpm 9
- Docker (Postgres + Redis)

## Bắt đầu

```bash
pnpm install
cp .env.example .env
pnpm docker:up                 # Postgres + Redis

# API
cp apps/api/.env.example apps/api/.env
pnpm --filter @app/api prisma:generate
pnpm --filter @app/api prisma:migrate   # sau khi thêm model vào schema.prisma

pnpm dev                       # chạy web + api song song (turbo)
```

- Web: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs

## Scripts (root, qua turbo)

| Lệnh | Việc |
|------|------|
| `pnpm dev` | dev tất cả app |
| `pnpm build` | build tất cả |
| `pnpm lint` | lint |
| `pnpm typecheck` | kiểm tra type |
| `pnpm test` | test |

## Feature-based

Mỗi nghiệp vụ (cash, bank, purchase, sales, inventory, catalog, report, auth) là 1 slice tự chứa.
FE: `apps/web/src/features/<x>/`. BE: `apps/api/src/modules/<x>/`.
Feature không import chéo file nội bộ — đi qua `shared` hoặc public API (`index.ts`).
Chi tiết quy tắc: [docs/tech.md](docs/tech.md).
