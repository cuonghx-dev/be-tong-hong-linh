# 01 — Nghiệp vụ Tiền mặt

> Đặc tả phân hệ **Tiền mặt** (quản lý quỹ tiền mặt) dựa trên MISA. Nguồn: `docs/misa-specs/01-tien-mat/`.

## 1. Tổng quan

Phân hệ Tiền mặt quản lý dòng tiền mặt tại quỹ qua 3 nghiệp vụ chính:

| Nghiệp vụ | Chứng từ | Mô tả |
|-----------|----------|-------|
| **Thu tiền** | Phiếu thu (PT) | Ghi tăng quỹ tiền mặt |
| **Chi tiền** | Phiếu chi (PC) | Ghi giảm quỹ tiền mặt |
| **Kiểm kê quỹ** | Biên bản kiểm kê | Đối chiếu tồn quỹ sổ sách vs thực tế |

Liên kết đối tượng: **Khách hàng**, **Nhà cung cấp**, **Nhân viên**. TK quỹ tiền mặt mặc định = **1111**.

Footer màn hình tổng quan có 4 nút: **Khách hàng** · **Nhà cung cấp** · **Nhân viên** · **Tùy chọn** (cài đặt phân hệ).

> ⚠️ **Kiểm kê quỹ**: liệt kê là nghiệp vụ chính nhưng **chưa có đặc tả form** (thiếu ảnh nguồn). Cần bổ sung khi có màn hình.

## 2. Danh sách thu/chi

Màn hình lưới liệt kê tất cả phiếu thu + phiếu chi.

### Cột hiển thị
| Cột | Nội dung | Ghi chú |
|-----|----------|---------|
| Chọn | Checkbox | Chọn nhiều dòng |
| Ngày hạch toán | Ngày ghi sổ | |
| Số chứng từ | Mã phiếu | Link mở chứng từ. Vd `PT4461/2026`, `PC 0120/2026` |
| Diễn giải | Nội dung thu/chi | |
| Số tiền | Tổng tiền | Định dạng nghìn phân cách |
| Đối tượng | KH/NCC/NV | |
| Lý do thu/chi | | Vd "Bán hàng hóa trong nước - Tiền mặt" |
| Loại chứng từ | Phân loại nghiệp vụ | Xem §5 |
| Hạch toán gộp nhiều hóa đơn | | Gộp nhiều hóa đơn |
| Chi nhánh | Chi nhánh lập chứng từ | ⚠️ Chưa xác thực từ ảnh danh sách (cột bị cắt). Suy ra từ footer chứng từ. |
| Chức năng | Nút **Xem** ▾ | Menu thao tác |

### Bộ lọc / thao tác
- Lọc theo khoảng ngày, loại chứng từ, đối tượng.
- Phân trang (mặc định 20 bản ghi/trang).
- Dòng được highlight khi hover/chọn.

## 3. Phiếu thu (PT)

Form tạo/sửa phiếu thu. Tiêu đề: `Phiếu thu <số>`.

### Chọn loại nghiệp vụ (dropdown đầu form)
Vd `4. Thu khác`. Loại quyết định định khoản mặc định.

Cạnh dropdown: ô **"Nhập số phiếu chi từ chi nhánh khác chuyển đến"** — nhận tiền chuyển nội bộ giữa chi nhánh.

### Thông tin chung
| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Mã đối tượng | | Chọn/thêm nhanh (+) |
| Tên đối tượng | | Auto theo mã |
| Người nộp | | |
| Địa chỉ | | Auto theo đối tượng |
| Nhân viên | | |
| Lý do nộp | | Mặc định "Thu tiền của…" |
| Kèm theo | | Số lượng chứng từ gốc |
| Ngày hạch toán | ✓ | Mặc định hôm nay |
| Ngày phiếu thu | ✓ | Mặc định hôm nay |
| Số phiếu thu | ✓ | Auto tăng, vd `PT4462/2026` (liền, không dấu cách) |
| Tham chiếu | | Link chứng từ liên quan |
| Tổng tiền | | Auto tổng dòng hạch toán |

### Bảng hạch toán
Cột: `#`, `Diễn giải`, `TK Nợ`, `TK Có`, `Số tiền`, `Nghiệp vụ`, `Đối tượng`, `Tên đối tượng`.
- TK Nợ mặc định **1111** (thu → nợ tiền mặt).
- Nút **Thêm dòng** / **Xóa hết dòng**.
- Dòng tổng cộng cuối bảng.
- Toggle **Hiển thị tài khoản** (ẩn/hiện cột TK).
- Header bảng có nút **AVA Kế toán** (AI gợi ý hạch toán) — optional.

### Đính kèm
Kéo/thả tệp, tối đa **5MB**.

### Nút hành động
`Hủy` · `Cất` · `Cất và Thêm`.

## 4. Phiếu chi (PC)

Tương tự phiếu thu, đảo chiều định khoản.

### Loại nghiệp vụ (dropdown)
Vd `2. Chi khác`, `3. Gửi tiền vào ngân hàng`.

### Khác biệt so với phiếu thu
| Điểm | Phiếu chi |
|------|-----------|
| Đối tượng | Người **nhận** (thay vì người nộp) |
| Lý do | "Chi tiền cho…" |
| Thứ tự field | **Lý do chi** nằm TRÊN **Nhân viên** (ngược PT: Nhân viên trên Lý do nộp) |
| TK Có mặc định | **1111** (chi → có tiền mặt) |
| Cột bảng | **Thay đổi theo loại nghiệp vụ** (xem dưới) |
| Nút hành động | `Hủy` · `Cất` · `Cất và In` |
| Phím tắt | `F3` tìm nhanh, `F9` thêm nhanh |
| Số phiếu chi | Có dấu cách sau prefix, vd `PC 0120/2026` |

### Cột bảng hạch toán theo loại nghiệp vụ
Cột động, phụ thuộc loại NV — KHÔNG cố định:
- **Chi khác** (loại 2): cột thêm **Khoản mục CP** (chi phí). Cột: `#`, `Diễn giải`, `TK Nợ`, `TK Có`, `Số tiền`, `Nghiệp vụ`, `Đối tượng`, `Tên đối tượng`, `Khoản mục CP`.
- **Gửi tiền vào ngân hàng** (loại 3): KHÔNG có Khoản mục CP/Đối tượng; thay bằng **TK ngân hàng** + **Tên ngân hàng**.

### Ví dụ: Gửi tiền vào ngân hàng (loại 3)
- TK Nợ **1121** / TK Có **1111**.
- Thêm cột **TK ngân hàng** (vd `119620376666`) + **Tên ngân hàng** (vd "Ngân hàng TMCP Công Thương Việt Nam").

## 5. Loại chứng từ

Loại chứng từ xác định định khoản mặc định và nguồn sinh phiếu. Thống kê từ dữ liệu mẫu:

| Loại chứng từ | Sinh từ | Ghi chú |
|---------------|---------|---------|
| Bán hàng hóa trong nước - Tiền mặt | Chứng từ bán hàng | Phiếu thu tự sinh khi bán thu tiền ngay |
| Phiếu thu | Nhập tay | Thu khác |
| Phiếu chi | Nhập tay | Chi khác |
| Chứng từ mua dịch vụ - Tiền mặt | Chứng từ mua dịch vụ | Phiếu chi tự sinh |
| Mua hàng trong nước không qua kho - Tiền mặt | Chứng từ mua hàng | Phiếu chi tự sinh |

### Chứng từ bán hàng → phiếu thu (liên kết)
Chứng từ bán hàng có option **Thu tiền ngay** + phương thức **Tiền mặt** → tự sinh phiếu thu (PT).
- **Dùng chung số**: chứng từ bán hàng và phiếu thu sinh ra mang cùng số, vd chứng từ `Chứng từ bán hàng PT4461/2026` → Số phiếu thu `PT4461/2026`.
- Nút hành động chứng từ bán hàng: `Bỏ ghi` · `Sửa nhanh` (khác PT/PC); footer thêm `Xem hóa đơn` · `In` · `Tiện ích`.
- Tab: `Phiếu thu` · `Phiếu xuất` · `Hóa đơn`.
- Options: `Kiêm phiếu xuất`, `Lập kèm hóa đơn`, `Là hóa đơn từ máy tính tiền`.
- Bảng hàng (tab Hàng tiền): `Mã hàng`, `Tên hàng`, `Chiết khấu TM`, `TK tiền` (1111), `TK doanh thu` (5112), `ĐVT`, `Số lượng`, `Đơn giá`, `Thành tiền`, `% Thuế GTGT`, `Tiền thuế GTGT`, `TK thuế GTGT` (33311).
- Tổng: Tổng tiền hàng, Thuế GTGT, Tổng tiền thanh toán.
- Trạng thái hóa đơn điện tử: `ĐÃ LẬP HÓA ĐƠN / ĐÃ CẤP MÃ`, mã CQT.

## 6. Báo cáo

| Mã | Báo cáo |
|----|---------|
| — | Bảng kê số dư tiền theo ngày |
| — | Dòng tiền |
| S03a1-DNN | Sổ nhật ký thu tiền |
| — | Sổ kế toán chi tiết quỹ tiền mặt |
| S03a2-DNN | Sổ nhật ký chi tiền |

Ngoài ra: **Tất cả báo cáo** (menu đầy đủ).

## 7. Mô hình dữ liệu (đề xuất)

### CashVoucher (phiếu thu/chi)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| type | enum | `RECEIPT` (PT) / `PAYMENT` (PC) |
| voucherNo | string | vd `PT4461/2026` |
| voucherType | enum/ref | Loại chứng từ (§5) |
| postingDate | date | Ngày hạch toán |
| voucherDate | date | Ngày phiếu |
| partnerId | ref | Đối tượng (KH/NCC/NV) |
| partnerName | string | |
| payerReceiver | string | Người nộp / người nhận |
| address | string | |
| employeeId | ref | Nhân viên |
| reason | string | Lý do thu/chi |
| attachmentCount | int | Kèm theo |
| referenceIds | ref[] | Tham chiếu |
| totalAmount | decimal | Auto tổng dòng |
| branchId | ref | Chi nhánh |
| attachments | file[] | ≤5MB |

### CashVoucherLine (dòng hạch toán)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| voucherId | ref | |
| lineNo | int | |
| description | string | Diễn giải |
| debitAccount | string | TK Nợ (thu → 1111) |
| creditAccount | string | TK Có (chi → 1111) |
| amount | decimal | Số tiền |
| operation | string | Nghiệp vụ |
| partnerId | ref | Đối tượng |
| costItemId | ref | Khoản mục CP (chỉ PC) |
| bankAccountNo | string | TK ngân hàng (gửi tiền) |
| bankName | string | |

## 8. Quy tắc nghiệp vụ

1. Số chứng từ auto tăng theo prefix + năm: PT liền `PT####/YYYY`, PC có dấu cách `PC ####/YYYY`. Phiếu thu sinh từ chứng từ bán hàng dùng chung số với chứng từ gốc.
2. Tổng tiền phiếu = Σ số tiền dòng hạch toán.
3. Thu: TK Nợ = 1111. Chi: TK Có = 1111.
4. Phiếu sinh từ chứng từ bán hàng/mua hàng → chỉ đọc phần liên kết, sửa ở chứng từ gốc.
5. Ngày hạch toán mặc định = ngày hiện tại, cho sửa.
6. Đính kèm giới hạn 5MB.
