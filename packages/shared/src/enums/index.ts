// Enum nghiệp vụ kế toán — dùng chung FE ↔ BE.

export enum PaymentMethod {
  Cash = 'CASH',
  BankTransfer = 'BANK_TRANSFER',
}

export enum AccountType {
  Asset = 'ASSET',
  Liability = 'LIABILITY',
  Equity = 'EQUITY',
  Revenue = 'REVENUE',
  Expense = 'EXPENSE',
}

// Tiền mặt (01-tien-mat) ------------------------------------------------------

// Loại chứng từ quỹ: Phiếu thu (PT) tăng quỹ / Phiếu chi (PC) giảm quỹ.
export enum CashVoucherType {
  Receipt = 'RECEIPT', // Phiếu thu (PT)
  Payment = 'PAYMENT', // Phiếu chi (PC)
}

// Loại nghiệp vụ (§5) — quyết định định khoản mặc định + nguồn sinh phiếu.
export enum CashVoucherCategory {
  SalesCash = 'SALES_CASH', // Bán hàng hóa trong nước - Tiền mặt (PT tự sinh)
  // Loại nghiệp vụ Phiếu thu nhập tay (§5) — quyết định định khoản TK Có mặc định.
  Receipt = 'RECEIPT', // Thu khác (Có tự nhập)
  // Loại nghiệp vụ Phiếu chi nhập tay (§5) — quyết định định khoản TK Nợ mặc định.
  PaymentEmployeeAdvance = 'PAYMENT_EMPLOYEE_ADVANCE', // 1. Tạm ứng cho nhân viên (Nợ 141)
  PaymentPurchaseWithInvoice = 'PAYMENT_PURCHASE_WITH_INVOICE', // 2. Chi mua ngoài có hóa đơn (Nợ tự nhập)
  DepositToBank = 'DEPOSIT_TO_BANK', // 3. Gửi tiền vào ngân hàng (Nợ 1121)
  PaymentSalaryAdvance = 'PAYMENT_SALARY_ADVANCE', // Trả lương tạm ứng cho nhân viên (Nợ 3341)
  Payment = 'PAYMENT', // 4. Chi khác (Nợ tự nhập)
  PurchaseServiceCash = 'PURCHASE_SERVICE_CASH', // Chứng từ mua dịch vụ - Tiền mặt (PC tự sinh)
  PurchaseGoodsCash = 'PURCHASE_GOODS_CASH', // Mua hàng trong nước không qua kho - Tiền mặt (PC tự sinh)
}

// Đối tượng liên kết chứng từ: Khách hàng / Nhà cung cấp / Nhân viên.
export enum PartnerType {
  Customer = 'CUSTOMER',
  Supplier = 'SUPPLIER',
  Employee = 'EMPLOYEE',
}

// Tiền gửi (02-tien-gui) ------------------------------------------------------

// Loại chứng từ tiền gửi: Thu tiền gửi (NTTK) tăng / Ủy nhiệm chi (UNC) giảm /
// Chuyển tiền nội bộ (CTNB) giữa 2 TKNH của đơn vị.
export enum BankVoucherType {
  Receipt = 'RECEIPT', // Thu tiền gửi (NTTK)
  Payment = 'PAYMENT', // Ủy nhiệm chi (UNC)
  Transfer = 'TRANSFER', // Chuyển tiền nội bộ (CTNB)
}

// Loại nghiệp vụ (§5) — quyết định định khoản mặc định + nguồn sinh phiếu.
export enum BankVoucherCategory {
  Receipt = 'RECEIPT', // Thu khác (thu tiền gửi nhập tay)
  InternalTransfer = 'INTERNAL_TRANSFER', // Chuyển tiền nội bộ — chỉ dùng cho chứng từ CTNB
  Payment = 'PAYMENT', // Ủy nhiệm chi nhập tay (chi khác)
}

// Phương thức thanh toán khi chi (§4) — chỉ dùng cho UNC.
export enum BankPaymentMethod {
  UNC = 'UNC', // Ủy nhiệm chi
  Transfer = 'TRANSFER', // Chuyển khoản
  Check = 'CHECK', // Séc
}

// Mua hàng (03-mua-hang) ------------------------------------------------------

// Loại chứng từ mua hàng (§5) — quyết định định khoản + cột bảng + prefix số.
export enum PurchaseVoucherType {
  Stock = 'STOCK', // Nhập kho (NK) → có TK Kho
  NonStock = 'NON_STOCK', // Không qua kho (MH)
  Service = 'SERVICE', // Mua dịch vụ (MDV)
}

// Nguồn gốc hàng mua (§5) — chỉ còn trong nước (loại nhập khẩu đã bỏ).
export enum PurchaseOrigin {
  Domestic = 'DOMESTIC', // Trong nước
}

// Hình thức thanh toán khi lập chứng từ (§4 - Tùy chọn đầu form).
export enum PurchasePaymentMode {
  Unpaid = 'UNPAID', // Chưa thanh toán → sinh công nợ 331
  Immediate = 'IMMEDIATE', // Thanh toán ngay tiền mặt → Có 1111 (PC tự sinh)
}

// Trạng thái nhận hóa đơn (cột TT nhận hóa đơn).
export enum PurchaseReceiveStatus {
  NotReceived = 'NOT_RECEIVED', // Chưa nhận HĐ
  Received = 'RECEIVED', // Đã nhận HĐ
}

// Trạng thái thanh toán công nợ (cột TT thanh toán).
export enum PurchasePaymentStatus {
  Unpaid = 'UNPAID', // Chưa thanh toán
  Partial = 'PARTIAL', // Thanh toán một phần
  Paid = 'PAID', // Đã thanh toán
}

// Loại nhà cung cấp: Tổ chức / Cá nhân.
export enum SupplierType {
  Organization = 'ORG',
  Individual = 'INDIVIDUAL',
}

// Bán hàng (04-ban-hang) ------------------------------------------------------

// Loại nghiệp vụ chứng từ bán hàng (§3) — quyết định TK doanh thu mặc định.
export enum SalesVoucherType {
  DomesticGoods = 'DOMESTIC_GOODS', // Bán hàng hóa trong nước (TK 5111)
}

// Tùy chọn thanh toán (§3) — quyết định định khoản TK Nợ + sinh phiếu thu.
// Chỉ còn 2 chứng từ bán hàng: chưa thu tiền (BH) và thu tiền mặt ngay (PT tự sinh).
export enum SalesPaymentMode {
  Unpaid = 'UNPAID', // Chưa thu tiền → công nợ 131
  PaidNow = 'PAID_NOW', // Thu tiền mặt ngay → Nợ 1111, sinh phiếu thu
}

// Hình thức thanh toán ghi trên hóa đơn (tab Hóa đơn §3) — MISA mặc định TM/CK.
export enum InvoicePaymentForm {
  Cash = 'CASH', // TM
  Transfer = 'TRANSFER', // CK
  CashOrTransfer = 'CASH_OR_TRANSFER', // TM/CK
}

// Trạng thái thanh toán chứng từ bán hàng (cột "TT thanh toán" MISA) — tính từ
// đối trừ thu tiền: thu ngay = Đã TT; chưa thu = so tổng phân bổ với tổng tiền.
export enum SalesPaymentStatus {
  Unpaid = 'UNPAID', // Chưa thanh toán
  Partial = 'PARTIAL', // Thanh toán một phần
  Paid = 'PAID', // Đã thanh toán
}

// Loại đối tượng khách hàng (§8): Tổ chức / Cá nhân.
export enum CustomerType {
  Organization = 'ORG',
  Individual = 'INDIVIDUAL',
}

// Phân tích tuổi nợ công nợ phải thu (§6) — theo số ngày quá hạn tính đến "Đến ngày".
// Tuổi = (Đến ngày − hạn thanh toán), hạn = dueDate, không có thì lấy voucherDate.
export enum ReceivableAging {
  All = 'ALL', // Tất cả
  Current = 'CURRENT', // Trong hạn (chưa quá hạn)
  Days1_30 = 'DAYS_1_30', // Quá hạn 1–30 ngày
  Days31_60 = 'DAYS_31_60', // Quá hạn 31–60 ngày
  Days61_90 = 'DAYS_61_90', // Quá hạn 61–90 ngày
  Over90 = 'OVER_90', // Quá hạn trên 90 ngày
}

// Tình trạng nợ công nợ phải thu (§6) — theo Số còn phải thu sau tổng hợp.
export enum ReceivableStatus {
  All = 'ALL', // Tất cả
  Outstanding = 'OUTSTANDING', // Còn nợ (> 0)
  Settled = 'SETTLED', // Đã thu hết (= 0)
  Prepaid = 'PREPAID', // Trả trước (< 0)
}

// Kho (05-kho) ----------------------------------------------------------------

// Loại chứng từ Phiếu nhập kho (Nhập kho) — quyết định định khoản TK Nợ/Có mặc định.
// Đối chiếu dropdown "Loại chứng từ" trên form MISA — chỉ dùng 2 loại (Nhap_kho.xlsx).
export enum InventoryReceiptType {
  Purchase = 'PURCHASE', // 1. Mua hàng trong nước nhập kho chưa thanh toán (Nợ 156 / Có 331)
  FinishedGoods = 'FINISHED_GOODS', // 2. Nhập kho thành phẩm sản xuất (Nợ 155 / Có 154)
}

// Lý do xuất kho (Xuất kho) — quyết định định khoản TK Nợ/Có mặc định.
// Đối chiếu dropdown "Lý do xuất" trên form MISA — chỉ dùng 2 loại (Xuat_kho.xlsx).
export enum GoodsIssueCategory {
  Sales = 'SALES', // 1. Xuất kho bán hàng (Nợ 632 / Có 156)
  Production = 'PRODUCTION', // 2. Xuất kho cho sản xuất (Nợ 621 / Có 152)
}

// Danh mục (05-danh-muc) ------------------------------------------------------

// Loại đối tượng tập hợp chi phí (Doi_tuong_tap_hop_chi_phi.xlsx cột "Loại").
export enum CostObjectType {
  Product = 'PRODUCT', // Sản phẩm
  Workshop = 'WORKSHOP', // Phân xưởng
  Other = 'OTHER', // Khác
}

// Nhãn hiển thị loại đối tượng THCP.
export const COST_OBJECT_TYPE_LABELS: Record<CostObjectType, string> = {
  [CostObjectType.Product]: 'Sản phẩm',
  [CostObjectType.Workshop]: 'Phân xưởng',
  [CostObjectType.Other]: 'Khác',
}

// Loại mục thu/chi (Danh_sach_muc_thuchi.xlsx cột "Loại").
export enum IncomeExpenseType {
  Income = 'INCOME', // Mục thu
  Expense = 'EXPENSE', // Mục chi
}

// Nhãn hiển thị loại mục thu/chi.
export const INCOME_EXPENSE_TYPE_LABELS: Record<IncomeExpenseType, string> = {
  [IncomeExpenseType.Income]: 'Mục thu',
  [IncomeExpenseType.Expense]: 'Mục chi',
}

// Bên kết chuyển (Danh_sach_tai_khoan_ket_chuyen.xlsx cột "Bên kết chuyển").
export enum TransferSide {
  Debit = 'DEBIT', // Nợ
  Credit = 'CREDIT', // Có
  Both = 'BOTH', // Hai bên
}

// Nhãn hiển thị bên kết chuyển.
export const TRANSFER_SIDE_LABELS: Record<TransferSide, string> = {
  [TransferSide.Debit]: 'Nợ',
  [TransferSide.Credit]: 'Có',
  [TransferSide.Both]: 'Hai bên',
}

// Tính chất vật tư hàng hóa (Danh_sach_hang_hoa_dich_vu.xlsx cột "Tính chất").
export enum ProductType {
  Goods = 'GOODS', // Hàng hóa
  Service = 'SERVICE', // Dịch vụ
  Finished = 'FINISHED', // Thành phẩm
  Material = 'MATERIAL', // Nguyên vật liệu
  Tool = 'TOOL', // Công cụ dụng cụ
}

// Nhãn hiển thị tính chất vật tư hàng hóa.
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  [ProductType.Goods]: 'Hàng hóa',
  [ProductType.Service]: 'Dịch vụ',
  [ProductType.Finished]: 'Thành phẩm',
  [ProductType.Material]: 'Nguyên vật liệu',
  [ProductType.Tool]: 'Công cụ dụng cụ',
}

// Tính chất tài khoản (Danh_sach_he_thong_tai_khoan_.xlsx cột "Tính chất").
export enum AccountNature {
  Debit = 'DEBIT', // Dư Nợ
  Credit = 'CREDIT', // Dư Có
  Dual = 'DUAL', // Lưỡng tính
}

// Nhãn hiển thị tính chất tài khoản.
export const ACCOUNT_NATURE_LABELS: Record<AccountNature, string> = {
  [AccountNature.Debit]: 'Dư Nợ',
  [AccountNature.Credit]: 'Dư Có',
  [AccountNature.Dual]: 'Lưỡng tính',
}

// Vai trò người dùng (auth). Đồng bộ với enum UserRole trong schema.prisma.
export enum UserRole {
  Admin = 'ADMIN', // Quản trị — toàn quyền, quản lý người dùng
  KeToan = 'KETOAN', // Kế toán — nghiệp vụ hằng ngày
  ThuQuy = 'THUQUY', // Thủ quỹ/Thủ kho — xem + ghi sổ cash/bank/kho, không sửa chứng từ
  Viewer = 'VIEWER', // Giám đốc — chỉ xem danh sách + báo cáo
}

// Nhãn hiển thị vai trò người dùng.
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Quản trị',
  [UserRole.KeToan]: 'Kế toán',
  [UserRole.ThuQuy]: 'Thủ quỹ',
  [UserRole.Viewer]: 'Giám đốc',
}

// Cấp tổ chức (Danh_sach_co_cau_to_chuc.xlsx cột "Cấp tổ chức").
// Đồng bộ với enum OrgUnitLevel trong schema.prisma.
export enum OrgUnitLevel {
  Company = 'COMPANY', // Tổng công ty/Công ty
  Branch = 'BRANCH', // Chi nhánh
  Department = 'DEPARTMENT', // Phòng ban
}

// Nhãn hiển thị cấp tổ chức.
export const ORG_UNIT_LEVEL_LABELS: Record<OrgUnitLevel, string> = {
  [OrgUnitLevel.Company]: 'Tổng công ty/Công ty',
  [OrgUnitLevel.Branch]: 'Chi nhánh',
  [OrgUnitLevel.Department]: 'Phòng ban',
}
