# Sơ đồ cơ sở dữ liệu

Toàn bộ schema Postgres của phần mềm, sinh từ [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma) — nhóm theo phân hệ nghiệp vụ. Mỗi chứng từ = 1 header + nhiều dòng bút toán kép (Nợ/Có).

**42 bảng · 28 enum · PostgreSQL/Prisma · migration `20260812000000_init` · tiền = `NUMERIC(18,2)`**

Quy ước vẽ:

- **Nét liền** = FK thật (ràng buộc DB, kèm hành vi Cascade/SetNull/Restrict)
- **Nét đứt** = tham chiếu lỏng (theo mã hiển thị, không FK)

## Tổng quan — luồng chứng từ giữa các phân hệ

Chứng từ mua/bán tự sinh chứng từ tiền và kho (tham chiếu lỏng `payment_id` / `receipt_id` / `issue_id`). Thu tiền sau đối trừ qua `payment_allocations`. Sổ sách/báo cáo union 7 bảng dòng bút toán; chứng từ `posted = false` bị loại khỏi sổ.

```mermaid
flowchart LR
  PUR["Mua hàng<br/>purchase_vouchers"]
  SAL["Bán hàng<br/>sales_vouchers"]
  CASH["Tiền mặt<br/>cash_vouchers"]
  BANK["Tiền gửi<br/>bank_vouchers"]
  IN["Nhập kho<br/>inventory_receipts"]
  OUT["Xuất kho<br/>goods_issue_vouchers"]
  ALLOC["Đối trừ<br/>payment_allocations"]
  GEN["Nghiệp vụ khác<br/>general_vouchers"]
  CAT[("Danh mục dùng chung<br/>products · warehouses · accounts<br/>customers · suppliers · employees")]

  PUR -. "trả ngay TM → sinh phiếu chi" .-> CASH
  PUR -. "loại nhập kho → sinh phiếu nhập" .-> IN
  SAL -. "thu TM ngay → sinh phiếu thu" .-> CASH
  SAL -. "kiêm phiếu xuất → sinh phiếu xuất" .-> OUT
  CASH --> ALLOC
  BANK --> ALLOC
  ALLOC --> SAL
  PUR -.-> CAT
  SAL -.-> CAT
  GEN -.-> CAT
  IN -.-> CAT
  OUT -.-> CAT
```

## Tiền mặt & tiền gửi (`cash` · `bank`)

Phiếu thu/chi (PT/PC) và thu tiền gửi/UNC/chuyển tiền nội bộ (NTTK/UNC/CTNB). Dòng thuế GTGT của phiếu chi là bút toán thật (`is_vat_line`, Nợ 1331). Chuyển tiền nội bộ (TRANSFER) tách 2 đầu TK trên báo cáo.

```mermaid
erDiagram
  cash_vouchers ||--o{ cash_voucher_lines : "Cascade"
  cash_vouchers ||--o{ payment_allocations : "Cascade"
  bank_vouchers ||--o{ bank_voucher_lines : "Cascade"
  bank_vouchers ||--o{ payment_allocations : "Cascade"

  cash_vouchers {
    uuid id PK
    enum type "RECEIPT | PAYMENT"
    enum category "8 loai nghiep vu"
    text voucher_no UK
    date posting_date
    text partner_id "ma KH/NCC/NV (long)"
    decimal total_amount
    bool posted
  }
  cash_voucher_lines {
    uuid id PK
    uuid voucher_id FK
    int line_no "unique theo phieu"
    text debit_account
    text credit_account
    decimal amount
    bool is_vat_line "dong thue GTGT"
  }
  bank_vouchers {
    uuid id PK
    enum type "RECEIPT | PAYMENT | TRANSFER"
    text voucher_no UK
    text bank_account_no
    text receiver_account_no "CTNB: TK nhan"
    decimal total_amount
    bool posted
  }
  bank_voucher_lines {
    uuid id PK
    uuid voucher_id FK
    int line_no "unique theo phieu"
    text debit_account
    text credit_account
    decimal amount
  }
```

## Mua hàng (`purchase`)

Ba loại: nhập kho / không qua kho / dịch vụ. Chứng từ dịch vụ đánh dấu `is_purchase_cost` mới được đem phân bổ chi phí vào phiếu nhập kho (§10.4). Xóa chứng từ chi phí đang được phân bổ bị chặn (Restrict) — tránh âm thầm đổi giá trị nhập kho của phiếu khác.

```mermaid
erDiagram
  suppliers ||--o{ purchase_vouchers : "SetNull"
  purchase_vouchers ||--o{ purchase_voucher_lines : "Cascade"
  purchase_vouchers ||--o{ purchase_cost_allocations : "phieu nhan CP (Cascade)"
  purchase_vouchers ||--o{ purchase_cost_allocations : "chung tu CP (Restrict)"
  purchase_vouchers }o..o| cash_vouchers : "payment_id: PC tu sinh"
  purchase_vouchers }o..o| inventory_receipts : "receipt_id: NK tu sinh"
  purchase_voucher_lines }o..o| products : "item_id"
  purchase_voucher_lines }o..o| warehouses : "warehouse_id"

  suppliers {
    uuid id PK
    text code UK
    text name
    bool is_customer
    decimal debt_amount
  }
  purchase_vouchers {
    uuid id PK
    enum type "STOCK | NON_STOCK | SERVICE"
    text voucher_no UK
    uuid supplier_id FK
    bool is_purchase_cost
    decimal total_payment
    enum payment_status "UNPAID | PARTIAL | PAID"
    bool posted
  }
  purchase_voucher_lines {
    uuid id PK
    uuid voucher_id FK
    int line_no "unique theo phieu"
    text item_id "ma hang (long)"
    decimal quantity
    decimal amount
    decimal vat_amount
  }
  purchase_cost_allocations {
    uuid id PK
    uuid voucher_id FK "phieu nhap nhan CP"
    uuid cost_voucher_id FK "chung tu chi phi"
    decimal amount
  }
```

## Bán hàng & đối trừ công nợ (`sales`)

Hai chứng từ: chưa thu tiền (BH) và thu tiền mặt ngay (PT tự sinh). Thu tiền sau đối trừ qua `payment_allocations` — trạng thái thanh toán = tổng phân bổ so với tổng tiền. CHECK `payment_allocations_source_xor`: đúng 1 trong 2 nguồn tiền (phiếu thu TM hoặc thu tiền gửi). Cascade cả 3 phía — xóa chứng từ nào đối trừ cũng tự mất.

```mermaid
erDiagram
  customers ||--o{ sales_vouchers : "FK"
  customers ||--o{ goods_issue_vouchers : "SetNull"
  sales_vouchers ||--o{ sales_voucher_lines : "Cascade"
  sales_vouchers ||--o{ payment_allocations : "Cascade"
  cash_vouchers ||--o{ payment_allocations : "Cascade"
  bank_vouchers ||--o{ payment_allocations : "Cascade"
  sales_vouchers }o..o| cash_vouchers : "receipt_id: PT tu sinh"
  sales_vouchers }o..o| goods_issue_vouchers : "issue_id: PXK tu sinh"

  customers {
    uuid id PK
    text code UK
    text name
    bool is_supplier
    bool debt_reminder_on
  }
  sales_vouchers {
    uuid id PK
    text voucher_no UK
    enum payment_mode "UNPAID | PAID_NOW"
    uuid customer_id FK
    bool is_inventory_issue "kiem phieu xuat"
    decimal total_amount
    bool posted
  }
  sales_voucher_lines {
    uuid id PK
    uuid voucher_id FK
    int line_no "unique theo phieu"
    text item_id "ma hang (long)"
    text revenue_account
    decimal amount
    decimal cost_price "tab gia von"
  }
  payment_allocations {
    uuid id PK
    uuid sales_voucher_id FK
    uuid cash_voucher_id FK "XOR voi bank"
    uuid bank_voucher_id FK "XOR voi cash"
    decimal amount
  }
```

## Kho — nhập & xuất (`inventory`)

Nhập kho: mua hàng / thành phẩm sản xuất. Xuất kho: bán hàng / sản xuất (nguyên vật liệu gắn `finished_product`). Line ghi cặp TK Nợ/Có riêng. Báo cáo tồn kho lọc trực tiếp trên bảng line qua index `(item_id, warehouse_id)`.

```mermaid
erDiagram
  inventory_receipts ||--o{ inventory_receipt_lines : "Cascade"
  goods_issue_vouchers ||--o{ goods_issue_lines : "Cascade"
  customers ||--o{ goods_issue_vouchers : "SetNull"
  inventory_receipt_lines }o..o| products : "item_id"
  inventory_receipt_lines }o..o| warehouses : "warehouse_id"
  goods_issue_lines }o..o| products : "item_id"
  goods_issue_lines }o..o| warehouses : "warehouse_id"

  inventory_receipts {
    uuid id PK
    enum receipt_type "PURCHASE | FINISHED_GOODS"
    text voucher_no UK
    date posting_date
    decimal total_amount
    bool posted
  }
  inventory_receipt_lines {
    uuid id PK
    uuid receipt_id FK
    int line_no "unique theo phieu"
    text item_id "ma hang (long)"
    decimal quantity
    decimal amount
    text lot_no
  }
  goods_issue_vouchers {
    uuid id PK
    enum category "SALES | PRODUCTION"
    text voucher_no UK
    uuid customer_id FK
    text department "xuat SX: bo phan"
    decimal total_amount
    bool posted
  }
  goods_issue_lines {
    uuid id PK
    uuid voucher_id FK
    int line_no "unique theo phieu"
    text item_id "ma hang (long)"
    decimal quantity
    decimal amount
    text finished_product "xuat SX"
  }
```

## Chứng từ nghiệp vụ khác (`general`)

Bút toán tự do: hàng về trước hóa đơn về sau, giải ngân vay, bù trừ công nợ… Đối tượng tách theo vế Nợ / vế Có. Dòng kê khai thuế **chỉ** phục vụ bảng kê GTGT, không sinh bút toán (khác phân hệ tiền mặt: bút toán thuế NVK do người dùng tự nhập ở tab Hạch toán).

```mermaid
erDiagram
  general_vouchers ||--o{ general_voucher_lines : "Cascade"
  general_vouchers ||--o{ general_voucher_tax_lines : "Cascade"

  general_vouchers {
    uuid id PK
    text voucher_no UK
    date posting_date
    date due_date "han thanh toan"
    text reference_no
    bool exclude_from_vat_report
    decimal total_amount
    bool posted
  }
  general_voucher_lines {
    uuid id PK
    uuid voucher_id FK
    int line_no "unique theo phieu"
    text debit_account
    text credit_account
    decimal amount
    enum operation "CKTM, giam gia, tra lai..."
    text debit_partner_id "doi tuong No (long)"
    text credit_partner_id "doi tuong Co (long)"
  }
  general_voucher_tax_lines {
    uuid id PK
    uuid voucher_id FK
    int line_no "unique theo phieu"
    enum tax_type "INPUT/OUTPUT x INC/DEC"
    decimal taxable_amount
    decimal vat_amount
    text invoice_no
  }
```

## Danh mục dùng chung (`catalog`)

Chứng từ tham chiếu danh mục chủ yếu bằng **mã** (tham chiếu lỏng). FK thật giữa danh mục: duy nhất Bank ← BankAccount (SetNull — xóa ngân hàng không mất tài khoản). Phân cấp cha–con qua `parent_id` tự trỏ.

```mermaid
erDiagram
  banks ||--o{ bank_accounts : "SetNull"
  accounts |o..o{ accounts : "parent_id"
  expense_items |o..o{ expense_items : "parent_id"
  organization_units |o..o{ organization_units : "parent_id"
  products }o..o| product_groups : "group_code"
  products }o..o| warehouses : "default_warehouse_code"
  customers }o..o| partner_groups : "group_id"
  suppliers }o..o| partner_groups : "group_id"

  banks {
    uuid id PK
    text short_name UK "VCB, BIDV..."
    text full_name
  }
  bank_accounts {
    uuid id PK
    text account_number UK
    uuid bank_id FK
    text account_holder
  }
  accounts {
    uuid id PK
    text number UK "he thong TK TT133/200"
    enum nature "DEBIT | CREDIT | DUAL"
    uuid parent_id "long, tu tro"
  }
  products {
    uuid id PK
    text code UK
    enum type "hang hoa, DV, TP, NVL, CCDC"
    text inventory_account "TK ngam dinh"
    decimal sale_price
  }
```

Các bảng danh mục còn lại (đứng độc lập, cờ `is_active` thay xóa cứng):

| Bảng | Vai trò | Khóa tự nhiên |
| --- | --- | --- |
| `warehouses` | Kho | `code` |
| `employees` | Nhân viên | `code` |
| `partner_groups` / `product_groups` | Nhóm KH-NCC / nhóm VTHH | `code` |
| `expense_items` | Khoản mục chi phí (cây) | `code` |
| `cost_objects` | Đối tượng tập hợp chi phí | `code` |
| `income_expense_items` | Mục thu/chi dòng tiền | `code` |
| `transfer_accounts` | Kết chuyển cuối kỳ (511-911…) | `code` |
| `default_accounts` | Cặp TK Nợ/Có ngầm định theo nghiệp vụ | — |
| `voucher_types` | Loại chứng từ (PT, PC…) | `code` |
| `units` | Đơn vị tính | `name` |
| `organization_units` | Cơ cấu tổ chức (cây 3 cấp) | `code` |
| `users` | Người dùng — RBAC 4 vai trò (ADMIN/KETOAN/THUQUY/VIEWER) | `email` |
| `book_locks` | Khóa sổ kỳ kế toán (1 dòng duy nhất, id = 1) | — |

## Số dư đầu kỳ (`opening-balance`)

5 bảng khai báo trước ngày bắt đầu hạch toán. TK tổng trong `account_opening_balances` = tổng các dòng chi tiết cùng mã TK ở bảng con tương ứng. `partner_opening_balances` đa hình theo `partner_type` — không FK cứng vì đối tượng nằm ở 2 bảng customers/suppliers.

```mermaid
erDiagram
  bank_accounts ||--o{ bank_account_opening_balances : "Cascade"
  products ||--o{ inventory_opening_balances : "Cascade"
  account_opening_balances |o..o{ partner_opening_balances : "cung account_code"
  account_opening_balances |o..o{ bank_account_opening_balances : "cung account_code"
  account_opening_balances |o..o{ fixed_asset_opening_balances : "cung ma TK 211x/214x"

  account_opening_balances {
    uuid id PK
    text account_code UK
    decimal debit_amount
    decimal credit_amount
  }
  partner_opening_balances {
    uuid id PK
    text account_code "131 / 331"
    enum partner_type "CUSTOMER | SUPPLIER"
    text partner_id "id da hinh, khong FK"
    decimal debit_amount
    decimal credit_amount
  }
  bank_account_opening_balances {
    uuid id PK
    text account_code "1121, 1122"
    uuid bank_account_id FK
    decimal debit_amount
    decimal credit_amount
  }
  fixed_asset_opening_balances {
    uuid id PK
    text code UK "ma tai san"
    decimal original_cost
    decimal accumulated_depreciation
    text asset_account "211x"
    text depreciation_account "214x"
  }
  inventory_opening_balances {
    uuid id PK
    uuid product_id FK
    text warehouse_code "long"
    decimal quantity
    decimal amount
  }
```

## Quy ước xuyên suốt schema

- **Header + lines** — mỗi chứng từ 1 header + n dòng bút toán kép; `@@unique(voucher_id, line_no)` chặn trùng số dòng. Update = xóa hết line cũ tạo lại trong `$transaction`.
- **Ghi sổ / bỏ ghi** — cờ `posted` trên mọi header; bỏ ghi là loại khỏi sổ/báo cáo, không xóa cứng dữ liệu.
- **Tiền = Decimal** — mọi cột tiền `NUMERIC(18,2)`, số lượng `NUMERIC(18,4)`, không float. DTO serialize `.toString()`.
- **Mã vs. row id** — cột đối tượng trên chứng từ (`partner_id`, `item_id`…) lưu **mã** hiển thị (tham chiếu lỏng); FK thật (uuid) chỉ ở các quan hệ vẽ nét liền.
- **Số chứng từ** — `voucher_no` unique, tự tăng theo `MAX(seq trong năm) + 1`, không dùng count+1.
- **Audit** — mọi bảng có `created_at` / `updated_at`, đa số kèm `created_by`; danh mục dùng cờ `is_active` thay xóa cứng.

Lưu ý: mỗi entity trong diagram chỉ liệt kê cột chủ chốt (PK/FK + trường nghiệp vụ chính). Schema đầy đủ xem `apps/api/prisma/schema.prisma`.
