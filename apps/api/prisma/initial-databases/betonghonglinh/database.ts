// Bộ dữ liệu khởi tạo của Công ty TNHH Bê Tông Hồng Lĩnh.
// Nguồn: bản xuất Excel từ MISA (repo be-tong-hong-linh @59fe1e0), copy nguyên trạng
// vào data/ — chỉ danh mục + số dư, KHÔNG có chứng từ.
import { AccountService } from '../../../src/modules/catalog/account.service'
import { BankService } from '../../../src/modules/catalog/bank.service'
import { CostObjectService } from '../../../src/modules/catalog/cost-object.service'
import { DefaultAccountService } from '../../../src/modules/catalog/default-account.service'
import { ExpenseItemService } from '../../../src/modules/catalog/expense-item.service'
import { IncomeExpenseItemService } from '../../../src/modules/catalog/income-expense-item.service'
import { OrganizationUnitService } from '../../../src/modules/catalog/organization-unit.service'
import { PartnerGroupService } from '../../../src/modules/catalog/partner-group.service'
import { ProductGroupService } from '../../../src/modules/catalog/product-group.service'
import { ProductService } from '../../../src/modules/catalog/product.service'
import { TransferAccountService } from '../../../src/modules/catalog/transfer-account.service'
import { UnitService } from '../../../src/modules/catalog/unit.service'
import { VoucherTypeService } from '../../../src/modules/catalog/voucher-type.service'
import { WarehouseService } from '../../../src/modules/catalog/warehouse.service'
import type { InitialDatabase } from '../types'

export const betonghonglinh: InitialDatabase = {
  name: 'betonghonglinh',
  description: 'Danh mục + số dư đầu kỳ Bê Tông Hồng Lĩnh (xuất từ MISA)',
  dir: __dirname,
  usersFile: 'Danh_sach_nguoi_dung.xlsx',
  accountBalancesFile: 'Danh_sach_so_du_tai_khoan.xlsx',
  // Thứ tự: cơ cấu tổ chức + hệ thống tài khoản trước để danh mục sau tham chiếu
  // (kho → chi nhánh, TK kết chuyển/ngầm định → mã TK). Tham chiếu đều lỏng (không FK)
  // nên sai thứ tự không vỡ, chỉ kém tự nhiên.
  catalogs: [
    { label: 'Cơ cấu tổ chức', file: 'Danh_sach_co_cau_to_chuc.xlsx', service: (p) => new OrganizationUnitService(p) },
    { label: 'Hệ thống tài khoản', file: 'Danh_sach_he_thong_tai_khoan_.xlsx', service: (p) => new AccountService(p) },
    { label: 'Tài khoản kết chuyển', file: 'Danh_sach_tai_khoan_ket_chuyen.xlsx', service: (p) => new TransferAccountService(p) },
    { label: 'Tài khoản ngầm định', file: 'Danh_sach_tai_khoan_ngam_dinh.xlsx', service: (p) => new DefaultAccountService(p) },
    { label: 'Kho', file: 'Danh_sach_kho.xlsx', service: (p) => new WarehouseService(p) },
    { label: 'Nhóm VTHH', file: 'Danh_sach_nhom_vat_tu_hang_hoa_dich_vu.xlsx', service: (p) => new ProductGroupService(p) },
    { label: 'Đơn vị tính', file: 'Danh_sach_don_vi_tinh.xlsx', service: (p) => new UnitService(p) },
    { label: 'Ngân hàng', file: 'Danh_sach_ngan_hang.xlsx', service: (p) => new BankService(p) },
    { label: 'Nhóm KH, NCC', file: 'Danh_sach_nhom_khach_hang_nha_cung_cap.xlsx', service: (p) => new PartnerGroupService(p) },
    { label: 'Khoản mục chi phí', file: 'Danh_sach_khoan_muc_chi_phi_.xlsx', service: (p) => new ExpenseItemService(p) },
    { label: 'Đối tượng tập hợp chi phí', file: 'Doi_tuong_tap_hop_chi_phi.xlsx', service: (p) => new CostObjectService(p) },
    { label: 'Vật tư hàng hóa', file: 'Danh_sach_hang_hoa_dich_vu.xlsx', service: (p) => new ProductService(p) },
    { label: 'Mục thu/chi', file: 'Danh_sach_muc_thuchi.xlsx', service: (p) => new IncomeExpenseItemService(p) },
    { label: 'Loại chứng từ', file: 'Danh_sach_loai_chung_tu.xlsx', service: (p) => new VoucherTypeService(p) },
  ],
}
