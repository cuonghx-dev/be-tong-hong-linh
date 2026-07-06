# Tech Stack — Phần mềm Kế toán Online SME

Kiến trúc và công nghệ cho phần mềm kế toán online dành cho doanh nghiệp vừa và nhỏ (SME).

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Kiến trúc](#kiến-trúc)
3. [Frontend — ReactJS](#frontend--reactjs)
4. [Backend — NestJS](#backend--nestjs)
5. [Database — PostgreSQL](#database--postgresql)
6. [DevOps](#devops)
7. [Cấu trúc thư mục — Feature-based](#cấu-trúc-thư-mục--feature-based)
8. [Frontend chi tiết — Form, State, API Fetch](#frontend-chi-tiết--form-state-api-fetch)

---

## Tổng quan

| Layer | Công nghệ |
|-------|-----------|
| Frontend | ReactJS (TypeScript) |
| Backend | NestJS (Node.js, TypeScript) |
| Database | PostgreSQL |
| ORM | Prisma hoặc TypeORM |
| Auth | JWT + Refresh Token |
| Cache/Queue | Redis + BullMQ |
| Deploy | Docker + Docker Compose |

## Kiến trúc

```
┌──────────────┐      HTTPS/REST      ┌──────────────┐      SQL      ┌──────────────┐
│   ReactJS    │  ────────────────▶   │   NestJS     │  ─────────▶   │  PostgreSQL  │
│   (SPA)      │  ◀────────────────   │   (API)      │  ◀─────────   │              │
└──────────────┘       JSON           └──────────────┘               └──────────────┘
                                             │
                                             ▼
                                       ┌──────────┐
                                       │  Redis   │  cache, queue, session
                                       └──────────┘
```

Client (React SPA) gọi REST API. NestJS xử lý nghiệp vụ, ghi/đọc PostgreSQL. Redis dùng cache và xử lý job nền (xuất báo cáo, gửi email).

---

## Frontend — ReactJS

- **Ngôn ngữ:** TypeScript
- **Build tool:** Vite
- **Routing:** React Router
- **State/Data:** TanStack Query (server state) + Zustand (client state)
- **UI:** shadcn/ui + TailwindCSS
- **Form:** React Hook Form + Zod (validation)
- **Table:** TanStack Table — cho danh sách chứng từ, hóa đơn, công nợ
- **Chart:** Recharts — biểu đồ thu chi, doanh thu

### Lý do
- SPA phù hợp app kế toán nhiều màn hình nhập liệu, bảng dữ liệu lớn.
- TanStack Query xử lý cache, refetch, optimistic update tốt cho data thay đổi liên tục.
- shadcn/ui component tùy biến, phù hợp giao diện dày đặc dạng bảng của MISA.

---

## Backend — NestJS

- **Ngôn ngữ:** TypeScript
- **Kiến trúc:** Modular (mỗi nghiệp vụ = 1 module)
- **Validation:** class-validator + class-transformer (DTO)
- **Auth:** Passport + JWT, guard theo role/quyền
- **Docs:** Swagger (OpenAPI) tự sinh từ decorator
- **Queue:** BullMQ (job xuất báo cáo, gửi mail, đồng bộ)
- **Log:** Pino / Winston

### Module theo nghiệp vụ (bám theo misa-specs)

| Module | Nghiệp vụ |
|--------|-----------|
| `cash` | Tiền mặt — phiếu thu, phiếu chi |
| `bank` | Tiền gửi ngân hàng — thu tiền, chi tiền |
| `purchase` | Mua hàng — chứng từ mua, nhà cung cấp |
| `sales` | Bán hàng — chứng từ bán, hóa đơn, công nợ khách hàng |
| `inventory` | Kho — nhập kho, xuất kho, tồn kho |
| `catalog` | Danh mục — hàng hóa/dịch vụ, khách hàng, nhà cung cấp |
| `auth` | Xác thực, phân quyền |
| `report` | Báo cáo tài chính, sổ sách |

### Lý do
- Module DI của NestJS map 1-1 với nghiệp vụ kế toán → tách bạch, dễ mở rộng.
- Decorator + Swagger giảm chi phí viết tài liệu API.
- Guard/Interceptor xử lý phân quyền, audit log tập trung — quan trọng với phần mềm kế toán.

---

## Database — PostgreSQL

- **Version:** PostgreSQL 15+
- **ORM:** Prisma (khuyến nghị) — type-safe, migration rõ ràng.
- **Kiểu số tiền:** `NUMERIC(18,2)` — KHÔNG dùng `float` cho tiền tệ.
- **Transaction:** bắt buộc cho mọi bút toán ghi sổ (double-entry) — đảm bảo nợ = có.
- **Audit:** cột `created_at`, `updated_at`, `created_by`; giữ lịch sử chứng từ.
- **Soft delete:** chứng từ kế toán không xóa cứng — dùng cờ trạng thái/hủy.

### Nguyên tắc dữ liệu kế toán
- Mọi giao dịch tài chính ghi theo bút toán kép (double-entry): mỗi chứng từ sinh các dòng Nợ/Có cân bằng.
- Kỳ kế toán đã khóa sổ → không cho sửa chứng từ.
- Số dư tính từ sổ cái, không lưu số dư "cứng" dễ sai lệch.

---

## DevOps

- **Container:** Docker + Docker Compose (dev), tách service api / web / db / redis.
- **Env:** biến môi trường qua `.env` (không commit secret).
- **CI/CD:** GitHub Actions — lint, test, build, deploy.
- **Migration:** chạy tự động khi deploy (Prisma migrate deploy).

---

## Cấu trúc thư mục — Feature-based

Tổ chức code theo **nghiệp vụ (feature)**, không theo loại file. Mỗi feature là 1 slice tự chứa: component, hook, api, schema, store riêng. Monorepo pnpm workspace / Turborepo để share type FE ↔ BE.

### Nguyên tắc

- **Colocation:** mọi thứ của 1 nghiệp vụ nằm chung 1 thư mục → mở `features/sales/` thấy toàn bộ code bán hàng.
- **Feature không import chéo nhau.** `sales` cần dùng `catalog` → đi qua `shared` hoặc public API của feature, không reach sâu vào file nội bộ.
- **`shared/` cho code dùng chung:** UI primitive, lib, type. Không chứa logic nghiệp vụ.
- **Feature bám theo `misa-specs`:** cash, bank, purchase, sales, inventory, catalog.

### Frontend (apps/web)

```
apps/web/src/
├── app/                      # khởi tạo app
│   ├── router.tsx            # định nghĩa route, lazy load theo feature
│   ├── providers.tsx         # QueryClientProvider, Theme, Auth
│   └── main.tsx
│
├── features/                 # mỗi nghiệp vụ 1 slice
│   ├── sales/                # BÁN HÀNG
│   │   ├── api/
│   │   │   ├── keys.ts       # query keys
│   │   │   ├── useInvoices.ts
│   │   │   └── useCreateInvoice.ts
│   │   ├── components/
│   │   │   ├── InvoiceForm.tsx
│   │   │   ├── InvoiceTable.tsx
│   │   │   └── InvoiceLineRow.tsx
│   │   ├── pages/
│   │   │   ├── InvoiceListPage.tsx
│   │   │   └── InvoiceDetailPage.tsx
│   │   ├── schema.ts         # Zod schema + type
│   │   ├── types.ts
│   │   ├── store.ts          # Zustand (nếu cần client state riêng)
│   │   └── index.ts          # public API — export ra ngoài dùng
│   │
│   ├── purchase/             # MUA HÀNG (cùng cấu trúc)
│   ├── cash/                 # TIỀN MẶT — phiếu thu/chi
│   ├── bank/                 # TIỀN GỬI
│   ├── inventory/            # KHO — nhập/xuất/tồn
│   ├── catalog/              # DANH MỤC — hàng hóa, KH, NCC
│   ├── report/               # BÁO CÁO
│   └── auth/                 # đăng nhập, phân quyền
│
├── shared/                   # dùng chung, KHÔNG chứa nghiệp vụ
│   ├── ui/                   # shadcn/ui: Button, Input, Table, Dialog
│   ├── lib/
│   │   ├── api.ts            # axios instance + interceptor
│   │   ├── query-client.ts
│   │   ├── currency.ts       # format/parse tiền tệ
│   │   └── date.ts
│   ├── hooks/                # useDebounce, useTableParams...
│   └── types/                # type dùng chung (Pagination, ApiError)
│
└── layouts/
    ├── AppLayout.tsx         # sidebar + header
    └── AuthLayout.tsx
```

**Public API mỗi feature — `index.ts`.** Feature chỉ export cái ngoài cần qua `index.ts`. Bên ngoài import từ `features/sales`, không phải `features/sales/components/InvoiceForm`.

```ts
// features/sales/index.ts
export { InvoiceListPage, InvoiceDetailPage } from './pages'
export { useInvoices } from './api/useInvoices'
export type { Invoice } from './types'
```

**Router — lazy load theo feature.**

```tsx
// app/router.tsx
const InvoiceListPage = lazy(() => import('@/features/sales/pages/InvoiceListPage'))

const routes = [
  { path: '/ban-hang/hoa-don', element: <InvoiceListPage /> },
  { path: '/mua-hang', element: <PurchaseListPage /> },
  // ...
]
```

Mỗi feature 1 bundle riêng → tải trang nào nạp code trang đó.

### Backend (apps/api) — module theo feature

NestJS module map 1-1 với feature FE.

```
apps/api/src/
├── modules/
│   ├── sales/
│   │   ├── sales.module.ts
│   │   ├── sales.controller.ts
│   │   ├── sales.service.ts
│   │   ├── dto/
│   │   │   ├── create-invoice.dto.ts
│   │   │   └── invoice-filter.dto.ts
│   │   └── entities/
│   │       └── invoice.entity.ts
│   ├── purchase/
│   ├── cash/
│   ├── bank/
│   ├── inventory/
│   ├── catalog/
│   ├── report/
│   └── auth/
│
├── common/                   # dùng chung
│   ├── guards/               # AuthGuard, RolesGuard
│   ├── interceptors/         # logging, transform response
│   ├── filters/              # exception filter
│   └── decorators/
│
├── database/
│   ├── prisma.service.ts
│   └── migrations/
│
└── main.ts
```

### Type dùng chung FE ↔ BE — `packages/shared`

Monorepo → share DTO/enum, tránh định nghĩa 2 lần.

```
packages/shared/src/
├── enums/          # InvoiceStatus, PaymentMethod, AccountType
├── dto/            # type request/response
└── constants/      # mã tài khoản kế toán (TT 133/200)
```

FE và BE cùng import từ `@app/shared`.

### Quy tắc import (tránh rối)

| Từ | Được import |
|----|-------------|
| `features/X` | `shared/*`, `packages/shared`, public API của feature khác (`features/Y`) |
| `shared/*` | chỉ `shared/*`, `packages/shared` — KHÔNG import `features` |
| `app/*` | mọi thứ (nơi lắp ráp) |

Feature không phụ thuộc lẫn nhau ở tầng file nội bộ → refactor/xóa 1 nghiệp vụ không vỡ chỗ khác.

---

## Frontend chi tiết — Form, State, API Fetch

### Nguyên tắc phân loại state

Tách rõ 2 loại state — sai lầm phổ biến là nhét mọi thứ vào 1 store.

| Loại | Ví dụ | Công cụ |
|------|-------|---------|
| **Server state** | Danh sách chứng từ, hóa đơn, tồn kho, công nợ | TanStack Query |
| **Client state** | Filter đang chọn, tab active, sidebar mở/đóng, form nháp | Zustand |

Dữ liệu từ DB = server state → **không** copy vào Zustand/Redux. Query lo cache, refetch, invalidate.

### 1. API Fetch — TanStack Query

**Cấu hình client.**

```ts
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s coi data còn "tươi"
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

**Axios instance — gắn token, refresh.**

```ts
// lib/api.ts
import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 401 → refresh token → retry (không đăng xuất ngay)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true
      await refreshToken()
      return api(err.config)
    }
    return Promise.reject(err)
  },
)
```

**Query key — chuẩn hóa theo nghiệp vụ.**

```ts
// features/sales/api/keys.ts
export const salesKeys = {
  all: ['sales'] as const,
  invoices: (filter: InvoiceFilter) => [...salesKeys.all, 'invoices', filter] as const,
  invoice: (id: string) => [...salesKeys.all, 'invoice', id] as const,
}
```

**Đọc danh sách — useQuery.**

```ts
// features/sales/api/useInvoices.ts
export function useInvoices(filter: InvoiceFilter) {
  return useQuery({
    queryKey: salesKeys.invoices(filter),
    queryFn: () => api.get('/sales/invoices', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,   // giữ data cũ khi đổi trang/filter
  })
}
```

**Ghi chứng từ — useMutation + invalidate.**

```ts
export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateInvoiceDto) =>
      api.post('/sales/invoices', dto).then((r) => r.data),
    onSuccess: () => {
      // hóa đơn mới → invalidate danh sách + công nợ + tồn kho
      qc.invalidateQueries({ queryKey: salesKeys.all })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['receivables'] })
    },
  })
}
```

> Quan trọng: 1 chứng từ kế toán ảnh hưởng nhiều bảng (sổ cái, công nợ, tồn kho). Sau mutation phải invalidate **tất cả** query liên quan để số liệu đồng bộ.

### 2. Form — React Hook Form + Zod

**Schema validation — Zod.**

```ts
// features/sales/schema.ts
import { z } from 'zod'

export const invoiceLineSchema = z.object({
  productId: z.string().min(1, 'Chọn hàng hóa'),
  quantity: z.number().positive('Số lượng > 0'),
  unitPrice: z.number().nonnegative(),
  vatRate: z.number().min(0).max(100),
})

export const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Chọn khách hàng'),
  issueDate: z.coerce.date(),
  lines: z.array(invoiceLineSchema).min(1, 'Cần ít nhất 1 dòng'),
})

export type InvoiceForm = z.infer<typeof invoiceSchema>
```

**Form + useFieldArray (chứng từ nhiều dòng).** Hóa đơn/phiếu kho có bảng dòng chi tiết → dùng `useFieldArray`.

```tsx
// features/sales/components/InvoiceForm.tsx
export function InvoiceForm({ onSubmit }: Props) {
  const form = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { lines: [{ quantity: 1, unitPrice: 0, vatRate: 10 }] },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  })

  // Tính tổng tiền real-time từ các dòng
  const lines = form.watch('lines')
  const total = lines.reduce(
    (s, l) => s + (l.quantity ?? 0) * (l.unitPrice ?? 0) * (1 + (l.vatRate ?? 0) / 100),
    0,
  )

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {fields.map((f, i) => (
        <LineRow key={f.id} index={i} form={form} onRemove={() => remove(i)} />
      ))}
      <button type="button" onClick={() => append({ quantity: 1, unitPrice: 0, vatRate: 10 })}>
        + Thêm dòng
      </button>
      <div>Tổng: {formatCurrency(total)}</div>
    </form>
  )
}
```

**Quy tắc form kế toán.**
- **Số tiền:** input dạng number, format hiển thị có phân cách nghìn; lưu raw number. KHÔNG dùng float — tính toán bằng integer (đồng) hoặc thư viện `decimal.js`.
- **Validation cân bằng:** phiếu kế toán tổng Nợ = tổng Có → validate ở cả Zod (client) và BE.
- **Server error:** map lỗi validation từ BE về `form.setError(field, ...)`.
- **Chặn mất dữ liệu:** cảnh báo khi rời form đang sửa dở (`form.formState.isDirty`).

### 3. Client State — Zustand

Chỉ cho UI state, filter, preference — KHÔNG cho data server.

```ts
// stores/ui.ts
import { create } from 'zustand'

interface UiState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  activeFiscalYear: number
  setFiscalYear: (y: number) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  activeFiscalYear: new Date().getFullYear(),
  setFiscalYear: (y) => set({ activeFiscalYear: y }),
}))
```

**Filter danh sách — URL state, không phải store.** Filter/phân trang của bảng nên đẩy lên URL (query param) → chia sẻ link, back/forward hoạt động. Dùng `useSearchParams` (React Router), không lưu vào Zustand.

```ts
const [params, setParams] = useSearchParams()
const filter = {
  page: Number(params.get('page') ?? 1),
  keyword: params.get('q') ?? '',
}
```

### Tóm tắt: chọn công cụ nào

| Tình huống | Dùng |
|-----------|------|
| Đọc/ghi data từ API | TanStack Query |
| Form nhập chứng từ | React Hook Form + Zod |
| Filter/phân trang bảng | URL search params |
| Sidebar, tab, năm tài chính active | Zustand |
| Số tiền, tính toán | integer (đồng) / decimal.js — không float |
