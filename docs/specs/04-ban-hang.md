# 04 — Nghiệp vụ Bán hàng

> Đặc tả phân hệ **Bán hàng** dựa trên MISA. Nguồn: `docs/misa-specs/04-ban-hang/`.

## 1. Tổng quan

Phân hệ Bán hàng quản lý quy trình bán hàng từ báo giá → đơn/hợp đồng → ghi nhận doanh thu → thu tiền, kèm xuất hóa đơn điện tử và theo dõi công nợ khách hàng.

### Nghiệp vụ chính (sơ đồ)
| Nghiệp vụ | Chứng từ | Mô tả |
|-----------|----------|-------|
| **Báo giá** | Báo giá | Chào giá cho khách |
| **Đơn đặt hàng** | Đơn đặt hàng | Khách đặt hàng |
| **Hợp đồng bán hàng** | Hợp đồng | Cam kết bán |
| **Ghi nhận doanh thu** | Chứng từ bán hàng (BH) | Ghi nhận doanh thu + công nợ phải thu |
| **Xuất hóa đơn** | Hóa đơn (HĐĐT) | Phát hành hóa đơn điện tử |
| **Trả lại hàng bán** | Chứng từ trả lại | Hàng bán bị trả lại |
| **Giảm giá hàng bán** | Chứng từ giảm giá | Giảm giá sau bán |
| **Thu tiền theo hóa đơn** | Phiếu thu (PT) | Thu công nợ (liên phân hệ Tiền mặt/Tiền gửi) |

> ⚠️ Các nghiệp vụ **Báo giá, Đơn đặt hàng, Hợp đồng, Trả lại hàng bán, Giảm giá hàng bán** liệt kê trong sơ đồ nhưng **chưa có đặc tả form** (thiếu ảnh nguồn). Đặc tả dưới đây tập trung: **Chứng từ bán hàng**, **Hóa đơn**, **Công nợ khách hàng**, **Khách hàng**.

### Footer màn hình tổng quan
5 nút: **Khách hàng** · **Hàng hóa, dịch vụ** · **Điều khoản thanh toán** · **Tiện ích** · **Tùy chọn**.

### Màn hình biểu đồ (dashboard)
Widget theo kỳ (mặc định "Tháng này"), đơn vị tính tiền = Đồng:
- **Đơn đặt hàng**: Giá trị đơn hàng · Đã xuất hóa đơn · Thực thu · Còn phải thu.
- **Hợp đồng**: Doanh số · Đã xuất hóa đơn · Thực chi · Thực thu · Còn phải thu.
- **Bán hàng**: Doanh thu bán hàng · Chưa xuất hóa đơn · Đã thanh toán · Còn phải thu.
- **Mặt hàng bán chạy** (top, số lượng + doanh thu), **Khách hàng có doanh thu lớn**, **Khách hàng có công nợ lớn**, biểu đồ **Doanh thu**.

## 2. Danh sách chứng từ bán hàng

Màn hình lưới liệt kê chứng từ bán hàng (ghi nhận doanh thu).

### Cột hiển thị
| Cột | Nội dung | Ghi chú |
|-----|----------|---------|
| Chọn | Checkbox | Chọn nhiều dòng |
| Ngày hạch toán | | vd `05/07/2026` |
| Số chứng từ | Mã chứng từ | Link mở. vd `PT4461/2026` |
| Số hóa đơn | Số HĐ liên kết | vd `00004692` |
| Khách hàng | Tên KH | vd "TG Innahouse - Cổ Đạm" |
| Tổng tiền thanh toán | | Định dạng nghìn phân cách |
| TT lập hóa đơn | Trạng thái | `Đã lập` |
| TT thanh toán | Trạng thái | `Đã thanh toán` |
| TT xuất hàng | Trạng thái | `Đã xuất đủ` |
| Chi nhánh | | vd "CÔNG TY TNHH BÊ TÔNG HỒNG LĨNH" (ảnh cắt `C H…`, xác nhận từ `Ban_hang.xlsx`) |
| Chức năng | Nút **Xem** ▾ | Menu thao tác |

### Thanh công cụ / thao tác
- Thanh công cụ (giống §4): `Thực hiện hàng loạt` ▾ · `Lọc` ▾ · bộ lọc kỳ · Tìm kiếm · xuất Excel · `Tiện ích` ▾ · **Thêm chứng từ** ▾.
- Dòng tổng cuối lưới (Tổng tiền thanh toán). vd `156.558.048.248`.
- Phân trang (mặc định 20 bản ghi/trang). vd tổng `5.139 bản ghi`, 257 trang.

## 3. Chứng từ bán hàng (BH)

Form ghi nhận doanh thu bán hàng. Tiêu đề: `Chứng từ bán hàng <số>` (vd `BH2167/2026`, `PT4461/2026`).

### Loại nghiệp vụ (dropdown đầu form)
vd `1. Bán hàng hóa trong nước`. Cạnh dropdown: ô **"Nhập số phiếu xuất"**.

### Tùy chọn thanh toán / hóa đơn (hàng radio + checkbox)
- Radio: **Chưa thu tiền** / **Thu tiền ngay** — quyết định sinh phiếu thu (§7).
- Nếu Thu tiền ngay: chọn phương thức (**Tiền mặt** / … dropdown).
- Checkbox: **Kiêm phiếu xuất** · **Lập kèm hóa đơn** · **Là hóa đơn từ máy tính tiền**.
- Góc phải: trạng thái hóa đơn, vd **ĐÃ LẬP HÓA ĐƠN**.

### Biến thể "Thu tiền ngay" (kiêm phiếu thu)
Khi chọn **Thu tiền ngay**, form thêm các trường phiếu thu (vd `PT4461/2026`):
- **Lý do nộp** — vd "Thu tiền bán hàng TG Innahouse - Cổ Đạm theo hóa đơn số 00004692" (auto sinh).
- **Kèm theo** · **Số lượng** · **Chứng từ gốc**.
- **Số phiếu thu** — vd `PT4461/2026` (dùng chung số với chứng từ bán hàng).
- Cột **TK công nợ** trong bảng hàng đổi thành **TK tiền** (`1111`) — xem bảng hàng bên dưới.

### Tab
`Chứng từ ghi nợ` · `Phiếu xuất` · `Hóa đơn`.

### Thông tin chung
| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Mã khách hàng | | Chọn/thêm nhanh (+), có nút xem công nợ ($) |
| Tên khách hàng | | Auto theo mã |
| Mã số thuế/CCCD chủ hộ | | Có nút tra cứu |
| Người liên hệ | | |
| Địa chỉ | | Auto theo KH |
| Nhân viên bán hàng | | Chọn/thêm nhanh (+) |
| Diễn giải | | Mặc định "Bán hàng" |
| Ngày hạch toán | ✓ | Có giờ, vd `05/07/2026 23:15:31` |
| Ngày chứng từ | ✓ | vd `05/07/2026` |
| Số chứng từ | ✓ | Auto, vd `BH2167/2026` |
| Tham chiếu | | Link chứng từ liên quan (vd hóa đơn, phiếu xuất) |
| Tổng tiền thanh toán | | Auto tổng bảng, hiển thị góc phải |

### Điều khoản thanh toán (nhóm mở rộng)
`Điều khoản thanh toán` (chọn/thêm +) · `Số ngày được nợ` · `Hạn thanh toán`.

### Bảng hàng (tab Hàng tiền)
Cột: `#`, `Mã hàng`, `Tên hàng`, `Chiết khấu thương mại`, `TK công nợ` (131), `TK doanh thu` (5111/5112), `ĐVT`, `Số lượng`, `Đơn giá`, `Thành tiền`, `% Thuế GTGT`, `Tiền thuế GTGT`, `TK thuế GTGT` (33311), `Số lô`.
- Cột TK động theo radio thanh toán: **Chưa thu tiền** → `TK công nợ` (131); **Thu tiền ngay** → `TK tiền` (1111).
- Chiết khấu: dropdown **Không chiết khấu** / … (góc phải bảng).
- Nút **AVA / Gợi ý hồ sơ** (AI gợi ý) — optional.
- Nút **Thêm dòng** · **Thêm ghi chú** · **Xóa hết dòng**.
- Dòng tổng cuối bảng. Toggle **Hiển thị tài khoản** (ẩn/hiện cột TK).
- Tab con: `Hàng tiền` · `Giá vốn`.

### Tổng cộng (góc phải)
`Tổng tiền hàng` · `Thuế GTGT` · `Tổng tiền thanh toán`.

### Thông tin bổ sung (dưới bảng)
- Checkbox **Là hóa đơn thay thế**.
- `Số đơn hàng từ hệ thống khác` · `Sàn thương mại điện tử` · `Ngày giao hàng thành công`.
- `Tên shop` · `Mã cửa hàng` · `Tên cửa hàng` · `Địa điểm giao hàng` · `Điều khoản khác`.
- Hóa đơn điện tử: `Mã tra cứu HĐĐT` (vd `8BF2U2N2W5VV`) · `Đường dẫn tra cứu HĐĐT` (vd `https://www.meinvoice.vn/tra-cuu/?sc=…`).

### Đính kèm
Kéo/thả tệp, tối đa **5MB**.

### Footer / nút hành động
- Form mới: `Hủy` · `Cất` · `Cất và In`.
- Form đã lưu: `Xem hóa đơn` · `In` ▾ · `Tiện ích` · toggle `Hiển thị tài khoản` · `Sửa nhanh` · `Bỏ ghi`. Điều hướng `‹ ›` giữa chứng từ.
- Footer ghi `Chi nhánh lập chứng từ: <tên công ty>`.

## 4. Danh sách hóa đơn

Màn hình lưới hóa đơn điện tử.

### Cột hiển thị
| Cột | Nội dung | Ghi chú |
|-----|----------|---------|
| Chọn | Checkbox | |
| Ngày hóa đơn | | |
| Số hóa đơn | | Link mở. vd `00004692` |
| Loại | Loại hóa đơn | vd "Hóa đơn từ máy tính tiền" |
| Trạng thái hóa đơn | | vd "Hóa đơn mới" |
| Khách hàng | | |
| Giá trị hóa đơn | | Nghìn phân cách |
| TT lập chứng từ | | `Đã lập đủ` |
| TT phát hành hóa đơn | | `Đã cấp mã` |
| Mã của CQT | Mã cơ quan thuế | vd `M1-26-QCFOR-00000005330` |
| TT gửi CQT | Trạng thái gửi cơ quan thuế | vd "HĐ hợp lệ" (từ xlsx) |
| Xử lý HĐ không hợp lệ | | (từ xlsx) |
| TT gửi hóa đơn | Trạng thái gửi HĐ cho KH | vd "Chưa gửi" (từ xlsx) |
| KH đã nhận hóa đơn | | (từ xlsx) |
| Chi nhánh | | vd "CÔNG TY TNHH BÊ TÔNG HỒNG LĨNH" (từ xlsx) |
| Chức năng | **Xem** ▾ | (chỉ trên lưới, không có trong xlsx) |

### Thanh công cụ
`Thực hiện hàng loạt` ▾ · `Lọc` ▾ · bộ lọc kỳ (vd "Đầu năm tới hiện tại") · Tìm kiếm · biểu tượng email (số chờ gửi) · xuất Excel · `Tiện ích` ▾ · **Thêm hóa đơn** ▾.
- Dòng tổng (Giá trị hóa đơn). Phân trang 20/trang. vd `5.140 bản ghi`.

## 5. Hóa đơn (HĐĐT)

Form tạo/xem hóa đơn bán hàng hóa, dịch vụ. Tiêu đề: `Hóa đơn bán hàng hóa, dịch vụ trong nước <số>`.

### Loại (dropdown đầu form)
vd `Hóa đơn bán hàng hóa, dịch vụ trong nước`. Cạnh: ô "Nhập chứng từ bán hàng, dịch vụ".
- Checkbox **Là hóa đơn từ máy tính tiền**.

### Thông tin chung
| Trường | Ghi chú |
|--------|---------|
| Mã khách hàng | Chọn/thêm nhanh (+), nút xem công nợ ($) |
| Tên khách hàng | |
| Mã số thuế/CCCD chủ hộ | Nút tra cứu |
| Mã số ĐVQHNS | Nút tra cứu |
| Số CCCD | |
| Số hộ chiếu | |
| Địa chỉ | |
| Điện thoại | |
| Người mua hàng | |
| Hình thức thanh toán | vd `TM/CK` |
| Tài khoản ngân hàng | dropdown |
| Nhân viên bán hàng | Chọn/thêm (+) |
| Tham chiếu | Link chứng từ bán hàng, vd `PT4461/2026` |
| Mẫu số HĐ | vd `1` |
| Ký hiệu HĐ | vd `1C26MYY` |
| Số hóa đơn | vd `00004692` |
| Ngày HĐ | vd `05/07/2026` |
| Checkbox **Đã hạch toán** | |
| Tổng tiền thanh toán | Góc phải, auto |

Góc phải trên: trạng thái phát hành — **CHƯA PHÁT HÀNH** (mới) / **ĐÃ CẤP MÃ** + `MÃ CQT: M1-26-QCFO…` (đã phát hành).

### Bảng hàng (Hàng tiền)
Cột: `#`, `Mã hàng`, `Tên hàng`, `Chiết khấu thương mại`, `ĐVT`, `Số lượng`, `Đơn giá`, `Thành tiền`, `% thuế GTGT`, `Tiền thuế GTGT`, `Số lô`, `Hạn sử dụng`.
- Chiết khấu dropdown (góc phải). `Thêm dòng` · `Thêm ghi chú` · `Xóa hết dòng`. Dòng tổng.

### Tổng cộng / bổ sung / đính kèm
- `Tổng tiền hàng` · `Thuế GTGT` · `Tổng tiền thanh toán`.
- Bổ sung: `Số đơn hàng từ hệ thống khác` · `Sàn TMĐT` · `Tên shop` · `Ngày giao hàng thành công` · `Mã cửa hàng` · `Tên cửa hàng` · checkbox `Là hóa đơn thay thế` · `Mã tra cứu HĐĐT` · `Đường dẫn tra cứu HĐĐT`.
- Đính kèm ≤5MB.

### Footer
- Form mới: `Hủy` · `Cất` · `Cất và In`.
- Form đã lưu: `Xem hóa đơn` · `In` ▾ · `Tiện ích` · `Sửa`. Điều hướng `‹ ›`.

## 6. Danh sách công nợ khách hàng

Màn hình lưới công nợ phải thu theo khách hàng.

### Cột hiển thị
| Cột | Nội dung | Ghi chú |
|-----|----------|---------|
| Mã khách hàng | | vd `CTY 134` |
| Tên khách hàng | | |
| Số còn phải thu theo HĐ | | |
| Số thu trước/Giảm trừ khác | | |
| Số còn phải thu | | Âm hiển thị đỏ trong ngoặc `(14.900.000)` |
| Địa chỉ | | |
| Mã số thuế | | |
| Nhóm khách hàng | | |
| Chức năng | Nút **Thu tiền** | Sinh phiếu thu công nợ. Ẩn ở dòng không đủ điều kiện thu (vd Số phải thu theo HĐ = 0) |

### Thanh công cụ / tổng
`Lọc` ▾ · Tìm kiếm · xuất Excel. Dòng **Tổng** (3 cột tiền). Phân trang 20/trang, vd `303 bản ghi`.

## 7. Liên kết & luồng nghiệp vụ

### Chứng từ bán hàng ↔ Hóa đơn ↔ Phiếu thu
- **Kiêm phiếu xuất**: chứng từ bán hàng đồng thời xuất kho.
- **Lập kèm hóa đơn**: chứng từ bán hàng sinh hóa đơn điện tử (tab `Hóa đơn`). Hóa đơn tham chiếu ngược về chứng từ bán hàng (vd HĐ `00004692` ↔ `PT4461/2026`).
- **Thu tiền ngay** + phương thức **Tiền mặt** → tự sinh **phiếu thu (PT)**, dùng chung số với chứng từ bán hàng (vd chứng từ `PT4461/2026` → phiếu thu `PT4461/2026`). Xem `01-tien-mat.md §5`.
- **Chưa thu tiền** → ghi công nợ phải thu (TK 131), thu sau qua **Thu tiền theo hóa đơn** / màn hình công nợ (§6).

### Định khoản mặc định
- Chưa thu tiền: Nợ **131** / Có **5111/5112** (doanh thu) + Có **33311** (thuế GTGT).
- Thu tiền ngay tiền mặt: Nợ **1111** / Có doanh thu + thuế (xem cột `TK tiền` = 1111 trong ảnh PT4461).

## 8. Khách hàng

Form thêm/sửa khách hàng (popup). Tiêu đề: `Thông tin khách hàng`.

### Loại đối tượng (radio)
**Tổ chức** / **Cá nhân**. Checkbox **Là nhà cung cấp** (dùng chung đối tượng KH/NCC).

### Thông tin chung
| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Mã số thuế/CCCD chủ hộ | | Nút tra cứu (auto điền tên/địa chỉ) |
| Mã số ĐVQHNS | | |
| Mã khách hàng | ✓ | vd `KH TGTRUNGPH` |
| Điện thoại | | |
| Website | | |
| Tên khách hàng | ✓ | |
| Nhóm khách hàng | | Chọn/thêm (+) |
| Địa chỉ | | vd "Số 82 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội" |
| Nhân viên bán hàng | | Chọn/thêm (+) |
| Checkbox **Là Đối tượng nội bộ** | | |

### Tab chi tiết
`Thông tin liên hệ` · `Điều khoản thanh toán` · `Tài khoản ngân hàng` · `Địa chỉ khác` · `Ghi chú` · `Thông tin bổ sung`.

Tab **Thông tin liên hệ**:
- Người liên hệ: `Xưng hô` · `Họ và tên` · `Email` · `Số điện thoại` · `Đại diện theo PL`.
- Người nhận hóa đơn điện tử: `Họ và tên` · `Email` (nhiều email ngăn bởi `;`) · `Số điện thoại`.

### Footer
`Hủy` · `Cất` · `Cất và Thêm`.

### Danh sách khách hàng (grid)
Cột (từ `Danh_sach_khach_hang.xlsx`): `Mã khách hàng` · `Tên khách hàng` · `Địa chỉ` · `Công nợ` · `Mã số thuế/CCCD chủ hộ` · `Điện thoại` · `ĐT di động NLH` · `Là Đối tượng nội bộ` · `Chi nhánh`.

## 9. Báo cáo

| Mã | Báo cáo |
|----|---------|
| — | Sổ chi tiết bán hàng |
| — | Chi tiết công nợ phải thu khách hàng |
| — | Tổng hợp bán hàng theo mặt hàng |
| — | Tổng hợp công nợ phải thu khách hàng |
| — | Báo cáo chi tiết lãi lỗ theo đơn hàng |

Ngoài ra: **Tất cả báo cáo**.

## 10. Mô hình dữ liệu (đề xuất)

### SalesVoucher (chứng từ bán hàng)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| voucherNo | string | vd `BH2167/2026` |
| voucherType | enum | vd Bán hàng hóa trong nước |
| paymentMode | enum | `UNPAID` (chưa thu) / `PAID_NOW` (thu ngay) |
| paymentMethod | enum | Tiền mặt / CK / … (khi thu ngay) |
| isInventoryIssue | bool | Kiêm phiếu xuất |
| withInvoice | bool | Lập kèm hóa đơn |
| isPosInvoice | bool | Hóa đơn từ máy tính tiền |
| customerId | ref | Khách hàng |
| customerName | string | |
| taxCode | string | MST/CCCD |
| contactPerson | string | Người liên hệ |
| address | string | |
| salesEmployeeId | ref | Nhân viên bán hàng |
| description | string | Diễn giải |
| postingDate | datetime | Ngày hạch toán |
| voucherDate | date | Ngày chứng từ |
| paymentTermId | ref | Điều khoản thanh toán |
| creditDays | int | Số ngày được nợ |
| dueDate | date | Hạn thanh toán |
| referenceIds | ref[] | Tham chiếu |
| totalGoods | decimal | Tổng tiền hàng |
| totalTax | decimal | Thuế GTGT |
| totalAmount | decimal | Tổng tiền thanh toán |
| invoiceId | ref | Hóa đơn liên kết |
| receiptId | ref | Phiếu thu (thu ngay) |
| branchId | ref | Chi nhánh |
| attachments | file[] | ≤5MB |

### SalesVoucherLine (dòng hàng)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| voucherId | ref | |
| lineNo | int | |
| itemId | ref | Mã hàng |
| itemName | string | Tên hàng |
| tradeDiscount | decimal | Chiết khấu thương mại |
| debtAccount | string | TK công nợ (131) |
| revenueAccount | string | TK doanh thu (5111/5112) |
| unit | string | ĐVT |
| quantity | decimal | Số lượng |
| unitPrice | decimal | Đơn giá |
| amount | decimal | Thành tiền |
| vatRate | decimal | % Thuế GTGT |
| vatAmount | decimal | Tiền thuế GTGT |
| vatAccount | string | TK thuế GTGT (33311) |
| lotNo | string | Số lô |

### Invoice (hóa đơn điện tử)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| invoiceNo | string | vd `00004692` |
| invoiceType | enum | vd Hóa đơn từ máy tính tiền |
| status | enum | Hóa đơn mới / … |
| issueStatus | enum | `UNISSUED` / `CODE_ISSUED` (đã cấp mã) |
| templateNo | string | Mẫu số HĐ |
| symbol | string | Ký hiệu HĐ (vd `1C26MYY`) |
| taxAuthorityCode | string | Mã CQT (vd `M1-26-QCFO…`) |
| taxSubmitStatus | enum | TT gửi CQT (vd "HĐ hợp lệ") |
| invalidHandling | string | Xử lý HĐ không hợp lệ |
| sendStatus | enum | TT gửi hóa đơn (vd "Chưa gửi") |
| customerReceived | bool | KH đã nhận hóa đơn |
| branchId | ref | Chi nhánh |
| lookupCode | string | Mã tra cứu HĐĐT |
| lookupUrl | string | Đường dẫn tra cứu |
| paymentForm | string | Hình thức thanh toán (vd `TM/CK`) |
| bankAccount | string | |
| invoiceDate | date | Ngày HĐ |
| posted | bool | Đã hạch toán |
| salesVoucherId | ref | Chứng từ bán hàng nguồn |
| customerId | ref | |
| totalAmount | decimal | |

### Customer (khách hàng)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| code | string | Mã khách hàng (bắt buộc) |
| name | string | Tên (bắt buộc) |
| isOrganization | bool | Tổ chức / Cá nhân |
| isSupplier | bool | Là nhà cung cấp |
| isInternal | bool | Đối tượng nội bộ |
| taxCode | string | MST/CCCD |
| ndqhnsCode | string | Mã số ĐVQHNS |
| phone | string | |
| website | string | |
| address | string | |
| groupId | ref | Nhóm khách hàng |
| salesEmployeeId | ref | Nhân viên bán hàng |
| contacts | json | Người liên hệ, người nhận HĐĐT |
| paymentTerms | json | Điều khoản thanh toán |
| bankAccounts | json | Tài khoản ngân hàng |

### CustomerReceivable (công nợ phải thu — view/tổng hợp)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| customerId | ref | |
| receivableByInvoice | decimal | Số còn phải thu theo HĐ |
| prepaidOrDeduction | decimal | Số thu trước/Giảm trừ khác |
| remainingReceivable | decimal | Số còn phải thu (có thể âm) |

## 11. Quy tắc nghiệp vụ

1. Chứng từ bán hàng ghi nhận doanh thu; công nợ vào TK **131** khi chưa thu tiền.
2. **Thu tiền ngay** → tự sinh phiếu thu dùng chung số với chứng từ bán hàng.
3. **Lập kèm hóa đơn** → sinh hóa đơn điện tử tham chiếu chứng từ; hóa đơn có mã tra cứu + mã CQT sau khi cấp mã.
4. Tổng tiền thanh toán = Σ thành tiền + Σ tiền thuế GTGT dòng hàng.
5. Ngày hạch toán/chứng từ mặc định = hiện tại, cho sửa. Số chứng từ auto tăng theo prefix + năm.
6. Đối tượng KH và NCC dùng chung (checkbox **Là nhà cung cấp**); mã KH bắt buộc, duy nhất.
7. Công nợ khách hàng: Số còn phải thu = Còn phải thu theo HĐ − Thu trước/Giảm trừ; âm hiển thị đỏ (khách trả thừa/ứng trước).
8. Đính kèm giới hạn 5MB.
