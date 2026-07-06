# 03 — Nghiệp vụ Mua hàng

> Đặc tả phân hệ **Mua hàng** (mua hàng hóa, dịch vụ; công nợ phải trả nhà cung cấp) dựa trên MISA. Nguồn: `docs/misa-specs/03-mua-hang/`.

## 1. Tổng quan

Phân hệ Mua hàng quản lý quy trình mua và công nợ phải trả NCC. Các nghiệp vụ chính (theo màn hình quy trình):

| Nghiệp vụ | Mô tả |
|-----------|-------|
| **Đơn mua hàng** | Đặt hàng NCC (dự trù, chưa nhập kho) |
| **Hợp đồng mua hàng** | Hợp đồng khung với NCC |
| **Nhận hàng hóa, dịch vụ** | Chứng từ mua hàng (nhập kho / không qua kho) |
| **Nhận hóa đơn** | Ghi nhận hóa đơn mua vào |
| **Xử lý hóa đơn đầu vào** | Xử lý HĐĐT đầu vào (Mới) |
| **Trả tiền theo hóa đơn** | Thanh toán công nợ NCC |

Tiện ích: **Đối trừ chứng từ**, **Đối trừ chứng từ nhiều đối tượng**, **Bỏ đối trừ**, **Bỏ đối trừ chứng từ nhiều đối tượng**, **Bù trừ công nợ**.

Đối tượng chính: **Nhà cung cấp**. TK công nợ phải trả mặc định = **331**.

Footer màn hình quy trình có 5 nút: **Nhà cung cấp** · **Hàng hóa, dịch vụ** · **Điều khoản thanh toán** · **Tiện ích** · **Tùy chọn**.

Menu ngang (tab): `Quy trình` · `Biểu đồ` · `Đơn mua hàng` · `Hợp đồng mua hàng` · `Mua hàng` · `Nhận hóa đơn` · `Trả lại hàng mua` · `Giảm giá hàng mua` · `Xử lý hóa đơn đầu vào` (Mới) · `Đối chiếu công nợ` (Mới) · `Báo cáo` · `Khác ▾`.

> ⚠️ Chưa có đặc tả form riêng cho: Đơn mua hàng, Hợp đồng mua hàng, Nhận hóa đơn, Trả lại hàng mua, Giảm giá hàng mua, Xử lý HĐĐT đầu vào, Đối chiếu công nợ (thiếu ảnh nguồn). Bổ sung khi có màn hình.

## 2. Biểu đồ (dashboard)

Đơn vị tính tiền chọn được (vd `Triệu đồng`). 3 thẻ tổng hợp + 2 thẻ NCC:

| Thẻ | Chỉ tiêu |
|-----|----------|
| **Đơn mua hàng** | Giá trị đơn hàng · Đã thực hiện · Đã thanh toán · Còn phải trả |
| **Hợp đồng mua** | Giá trị hợp đồng · Đã thực hiện · Đã thanh toán · Còn phải trả |
| **Mua hàng** | Tổng tiền mua hàng · Đã thanh toán · Còn phải trả |
| **Nhà cung cấp có công nợ lớn** | Top NCC theo số nợ (mã, tên, số tiền) |
| **Nhà cung cấp có giá trị mua lớn** | Top NCC theo giá trị mua |

Mỗi thẻ có bộ lọc kỳ (`Tháng này ▾`), nút tải lại, mốc `Số liệu tính đến: <giờ>`. Số âm/còn phải trả hiển thị màu đỏ trong ngoặc `(12.671)`.

## 3. Danh sách mua hàng

Màn hình lưới liệt kê chứng từ mua hàng.

### Cột hiển thị
| Cột | Nội dung | Ghi chú |
|-----|----------|---------|
| Chọn | Checkbox | Chọn nhiều dòng |
| Ngày hạch toán | Ngày ghi sổ | |
| Số chứng từ | Mã chứng từ | Link mở. Vd `NK07098`, `MH326/2025`, `MDV411/2025` |
| Số hóa đơn | Số HĐ mua vào | |
| Nhà cung cấp | Tên NCC | |
| Tổng tiền thanh toán | Tổng tiền | Định dạng nghìn phân cách |
| Chi phí mua hàng | CP thu mua phân bổ | |
| Giá trị nhập kho | Giá trị hàng nhập kho | |
| TT nhận hóa đơn | `Đã nhận HĐ` / … | Trạng thái hóa đơn |
| TT thanh toán | `Chưa thanh toán` / … | Trạng thái thanh toán |
| Loại chứng từ | Phân loại (Mua kho / không qua kho / Chứng từ …) | Cột bị cắt trong ảnh |
| Chức năng | Nút **Trả tiền** ▾ | Menu thao tác |

### Bộ lọc / thao tác
- **Thực hiện hàng loạt** ▾ (thao tác nhiều dòng).
- **Lọc** ▾ theo kỳ (vd `Đầu năm tới hiện tại`), loại chứng từ, NCC, trạng thái.
- Tìm kiếm, tải lại, xuất Excel, cài đặt cột.
- Nút **Thêm** ▾ (tạo chứng từ) · **Thêm bằng AI**.
- Prefix số chứng từ: `NK` (nhập kho), `MH` (mua hàng), `MDV` (mua dịch vụ).

## 4. Chứng từ mua hàng

Form tạo/sửa chứng từ mua hàng. Tiêu đề: `Chứng từ mua hàng <số>` (vd `NK07099`).

### Loại nghiệp vụ (dropdown đầu form)
Vd `Mua hàng trong nước nhập kho`. Loại quyết định định khoản + cột bảng. Cạnh dropdown: ô **"Nhập số hợp đồng mua …"** (liên kết hợp đồng).

### Tùy chọn đầu form
- Radio: **Chưa thanh toán** / **Thanh toán ngay**.
- Phương thức thanh toán (khi TT ngay): vd `Tiền mặt`.
- **Nhận kèm hóa đơn** ▾ (nhận hàng kèm hóa đơn hay không).
- Tab: **Phiếu nhập** · **Hóa đơn**.

### Thông tin chung
| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Mã nhà cung cấp | | Chọn/thêm nhanh (+); nút `$` xem công nợ |
| Tên nhà cung cấp | | Auto theo mã |
| Người giao hàng | | |
| Địa chỉ | | Auto theo NCC |
| Nhân viên mua hàng | | Chọn/thêm nhanh (+) |
| Diễn giải | | Mặc định "Mua hàng" |
| Kèm theo | | Số lượng chứng từ gốc |
| Tham chiếu | | Link chứng từ liên quan |
| Ngày hạch toán | ✓ | Mặc định hôm nay (có giờ) |
| Ngày chứng từ | ✓ | Mặc định hôm nay |
| Số phiếu nhập | ✓ | Auto tăng, vd `NK07099` |
| Điều khoản thanh toán | | Chọn/thêm nhanh (+) |
| Số ngày được nợ | | Auto tính hạn TT |
| Hạn thanh toán | | `DD/MM/YYYY` |
| Tổng tiền thanh toán | | Auto tổng dòng (góc phải header) |

### Bảng hàng tiền (tab **Hàng tiền**)
Cột: `#`, `Mã hàng`, `Tên hàng`, `Kho`, `TK Kho`, `TK Công nợ`, `ĐVT`, `Số lượng`, `Đơn giá`, `Thành tiền`, `% Thuế GTGT`, `Tiền thuế GTGT`, `TK thuế GTGT`.
- TK Công nợ mặc định **331**. TK thuế GTGT mặc định **1331** (thuế đầu vào được khấu trừ).
- Nút **Thêm dòng** / **Thêm ghi chú** / **Xóa hết dòng**.
- Dòng tổng cộng cuối bảng (Σ số lượng, Σ thành tiền, Σ tiền thuế).
- Toggle **Hiển thị tài khoản** (ẩn/hiện cột TK).
- Header bảng: **AVA Kế toán** ▾ (AI gợi ý) · **Chiết khấu** ▾ (vd `Không chiết khấu`).
- Phân trang: `20 bản ghi trên 1 trang`.
- Tab **Chi phí** (bên cạnh Hàng tiền): nhập chi phí mua hàng phân bổ.

### Tra cứu HĐĐT
Trường **Mã tra cứu HĐĐT** + **Đường dẫn tra cứu HĐĐT**.

### Tổng hợp (góc phải dưới)
Tổng tiền hàng · Thuế GTGT · Tổng tiền thanh toán · **Chi phí mua hàng** · **Giá trị nhập kho**.

### Đính kèm
Kéo/thả tệp, tối đa **5MB**.

### Nút hành động
`Hủy` · `Cất` · `Cất và Đóng`. Phím tắt: `F3` tìm nhanh, `F9` thêm nhanh.

## 5. Loại chứng từ

Loại chứng từ xác định định khoản mặc định + cột bảng + prefix số:

| Loại chứng từ | Prefix | Ghi chú |
|---------------|--------|---------|
| Mua hàng trong nước nhập kho | `NK` | Nhập kho → có TK Kho (152/156/…) |
| Mua hàng trong nước không qua kho | `MH` | Chi phí thẳng, không nhập kho |
| Mua dịch vụ | `MDV` | Dịch vụ, không có TK Kho |

Định khoản chung: Nợ TK hàng/chi phí + Nợ **1331** (thuế GTGT đầu vào) / Có **331** (phải trả NCC). Nếu **Thanh toán ngay** → Có **1111**/**1121** thay vì 331.

## 6. Nhà cung cấp

### Danh sách NCC
Màn hình lưới. Tổng số bản ghi hiển thị cuối (vd `278 bản ghi`).

| Cột | Nội dung |
|-----|----------|
| Chọn | Checkbox |
| Mã nhà cung cấp | Vd `CTY_A CHAU` |
| Tên nhà cung cấp | |
| Địa chỉ | |
| Số tiền nợ | Công nợ hiện tại; số âm màu đỏ trong ngoặc |
| Mã số thuế/CCCD chủ hộ | |
| Rủi ro về hóa đơn | Cảnh báo rủi ro NCC |
| Văn bản tham chiếu | |
| Chức năng | **Lập CT mua hàng** ▾ (hoặc **Trả tiền** ▾ nếu có nợ) |

Thao tác: **Thực hiện hàng loạt** ▾ · **Lọc** ▾ · **Cập nhật địa chỉ** · **Tiện ích** ▾ · **Thêm** ▾.

### Form thêm/sửa NCC
Tiêu đề: `Thông tin nhà cung cấp`. Radio **Tổ chức** / **Cá nhân**. Checkbox **Là khách hàng** (dùng chung đối tượng KH+NCC).

| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Mã số thuế/CCCD chủ hộ | | Có nút tra cứu; auto điền tên+địa chỉ từ MST |
| Mã số ĐVQHNS | | Đơn vị quan hệ ngân sách |
| Mã nhà cung cấp | ✓ | Vd `CTY_MINHQUAN` |
| Điện thoại | | |
| Website | | |
| Tên nhà cung cấp | ✓ | |
| Nhóm nhà cung cấp | | Chọn/thêm nhanh (+) |
| Địa chỉ | | |
| Nhân viên mua hàng | | Chọn/thêm nhanh (+) |
| Là Đối tượng nội bộ | | Checkbox |

Tab thông tin: **Thông tin liên hệ** (Xưng hô, Họ và tên, Email, Số điện thoại, Đại diện theo PL) · **Điều khoản thanh toán** · **Tài khoản ngân hàng** · **Địa chỉ khác** · **Ghi chú** · **Thông tin bổ sung**.

Nút hành động: `Hủy` · `Cất` · `Cất và Thêm`.

## 7. Hàng hóa, dịch vụ

Danh sách hàng hóa/dịch vụ. Tổng số bản ghi cuối (vd `542 bản ghi`). Header có bộ lọc nhanh trạng thái tồn: **Sắp hết hàng** (số lượng) · **Hết hàng** (số lượng).

| Cột | Nội dung |
|-----|----------|
| Chọn | Checkbox |
| Tên | Tên hàng/dịch vụ |
| Mã | Mã hàng, vd `BOM 37`, `BINHDAU` |
| Giảm thuế theo quy định | Trạng thái (vd `Chưa xác định`) + icon % |
| Tính chất | `Hàng hóa` / `Dịch vụ` / `Công cụ, dụng cụ` |
| Số lượng tồn | Định dạng thập phân (`0,00`) |
| Giá trị tồn | |
| Chi nhánh | Đơn vị sở hữu |
| Chức năng | **Sửa** ▾ |

Dòng **Tổng** cuối lưới: Σ số lượng tồn, Σ giá trị tồn.
Thao tác: **Thực hiện hàng loạt** ▾ · **Lọc** ▾ · tìm kiếm · quét mã vạch · xuất Excel · cài đặt · **Tiện ích** ▾ · **Thêm** ▾.

> Chi tiết form thêm/sửa hàng hóa: xem phân hệ Kho (`05-kho`).

## 8. Báo cáo

| Báo cáo |
|---------|
| Sổ chi tiết mua hàng |
| Chi tiết công nợ phải trả nhà cung cấp |
| Tổng hợp mua hàng theo mặt hàng |
| Tổng hợp công nợ phải trả nhà cung cấp |
| Biên bản đối chiếu và xác nhận công nợ phải trả |

Ngoài ra: **Tất cả báo cáo** (menu đầy đủ).

## 9. Mô hình dữ liệu (đề xuất)

### PurchaseVoucher (chứng từ mua hàng)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| voucherNo | string | vd `NK07099` |
| voucherType | enum | `STOCK` (nhập kho) / `NON_STOCK` (không qua kho) / `SERVICE` (dịch vụ) |
| paymentMode | enum | `UNPAID` (chưa TT) / `IMMEDIATE` (TT ngay) |
| paymentMethod | enum | Tiền mặt / Chuyển khoản (khi TT ngay) |
| receiveWithInvoice | bool | Nhận kèm hóa đơn |
| postingDate | datetime | Ngày hạch toán |
| voucherDate | date | Ngày chứng từ |
| invoiceNo | string | Số hóa đơn |
| supplierId | ref | Nhà cung cấp |
| supplierName | string | |
| deliverer | string | Người giao hàng |
| address | string | |
| employeeId | ref | Nhân viên mua hàng |
| description | string | Diễn giải |
| attachmentCount | int | Kèm theo |
| referenceIds | ref[] | Tham chiếu |
| contractNo | string | Số hợp đồng mua |
| paymentTermId | ref | Điều khoản thanh toán |
| creditDays | int | Số ngày được nợ |
| dueDate | date | Hạn thanh toán |
| totalGoods | decimal | Tổng tiền hàng |
| totalVat | decimal | Thuế GTGT |
| totalPayment | decimal | Tổng tiền thanh toán |
| purchaseCost | decimal | Chi phí mua hàng |
| stockValue | decimal | Giá trị nhập kho |
| discountType | enum | Chiết khấu |
| einvoiceLookupCode | string | Mã tra cứu HĐĐT |
| einvoiceLookupUrl | string | Đường dẫn tra cứu HĐĐT |
| receiveStatus | enum | TT nhận hóa đơn |
| paymentStatus | enum | TT thanh toán |
| branchId | ref | Chi nhánh |
| attachments | file[] | ≤5MB |

### PurchaseVoucherLine (dòng hàng tiền)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| voucherId | ref | |
| lineNo | int | |
| itemId | ref | Mã hàng |
| itemName | string | Tên hàng |
| warehouseId | ref | Kho (chỉ loại nhập kho) |
| stockAccount | string | TK Kho (152/156/…) |
| payableAccount | string | TK Công nợ (mặc định 331) |
| unit | string | ĐVT |
| quantity | decimal | Số lượng |
| unitPrice | decimal | Đơn giá |
| amount | decimal | Thành tiền |
| vatRate | decimal | % Thuế GTGT |
| vatAmount | decimal | Tiền thuế GTGT |
| vatAccount | string | TK thuế GTGT (mặc định 1331) |

### Supplier (nhà cung cấp)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| code | string | Mã NCC, vd `CTY_A CHAU` |
| name | string | |
| type | enum | `ORG` (tổ chức) / `INDIVIDUAL` (cá nhân) |
| isCustomer | bool | Là khách hàng (đối tượng dùng chung) |
| taxCode | string | Mã số thuế/CCCD |
| budgetRelationCode | string | Mã số ĐVQHNS |
| phone | string | |
| website | string | |
| address | string | |
| groupId | ref | Nhóm NCC |
| employeeId | ref | Nhân viên mua hàng |
| isInternal | bool | Đối tượng nội bộ |
| debtAmount | decimal | Số tiền nợ |
| invoiceRisk | string | Rủi ro về hóa đơn |
| contacts | Contact[] | Thông tin liên hệ |
| bankAccounts | BankAccount[] | Tài khoản ngân hàng |

## 10. Quy tắc nghiệp vụ

1. Số chứng từ auto tăng theo prefix loại NV: `NK####` (nhập kho), `MH####/YYYY`, `MDV####/YYYY`.
2. Tổng tiền hàng = Σ thành tiền dòng; Thuế GTGT = Σ tiền thuế dòng; Tổng tiền thanh toán = Tổng tiền hàng + Thuế GTGT (+ chi phí mua hàng nếu tính vào TT).
3. Định khoản: Nợ TK hàng/chi phí + Nợ 1331 / Có 331 (chưa TT) hoặc Có 1111/1121 (TT ngay).
4. Chi phí mua hàng phân bổ vào giá trị nhập kho (tab Chi phí).
5. **Chưa thanh toán** → sinh công nợ phải trả (331) theo NCC, hạn TT = ngày CT + số ngày được nợ.
6. **Trả tiền** từ danh sách → sinh phiếu chi/UNC đối trừ công nợ NCC.
7. Ngày hạch toán mặc định = ngày hiện tại, cho sửa.
8. NCC có thể đồng thời là khách hàng (checkbox "Là khách hàng") — dùng chung đối tượng.
9. Đính kèm giới hạn 5MB.
