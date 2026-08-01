// Khai báo 1 bộ dữ liệu khởi tạo. Mỗi bộ = 1 thư mục con trong prisma/initial-databases/
// gồm file database.ts (khai báo) + data/*.xlsx (dữ liệu). Runner ở runner.ts dùng chung
// cho mọi bộ — thêm bộ mới chỉ cần khai báo, không sửa runner.
import type { PrismaService } from '../../src/database/prisma.service'

// Mọi service catalog đều phơi cùng chữ ký importXlsx (giống nhập Excel trên UI).
export interface XlsxImporter {
  importXlsx(buffer: Buffer): Promise<{ total: number; created: number; skipped: number }>
}

export interface CatalogImport {
  label: string // Nhãn in ra console, dùng tên nghiệp vụ tiếng Việt
  file: string // Tên file trong thư mục data/ của bộ dữ liệu
  service: (prisma: PrismaService) => XlsxImporter
}

export interface InitialDatabase {
  name: string // Định danh bộ dữ liệu, trùng tên thư mục
  description: string
  dir: string // Đường dẫn tuyệt đối tới thư mục chứa data/
  usersFile?: string // Danh sách tài khoản đăng nhập (cột: Email | Tên | Vai trò | Trạng thái)
  catalogs: CatalogImport[] // Thứ tự khai báo = thứ tự nhập
  accountBalancesFile?: string // Số dư tài khoản đầu kỳ
}
