# 02 — Nghiệp vụ Tiền gửi

> Đặc tả phân hệ **Tiền gửi** (quản lý tiền gửi ngân hàng) dựa trên MISA. Nguồn: `docs/misa-specs/02-tien-gui/`.

## 1. Tổng quan

Phân hệ Tiền gửi quản lý dòng tiền qua tài khoản ngân hàng, gồm 3 nghiệp vụ chính:

| Nghiệp vụ | Chứng từ | Mô tả |
|-----------|----------|-------|
| **Thu tiền** | Thu tiền gửi (số `NTTK…`) | Ghi tăng tiền gửi ngân hàng |
| **Chi tiền** | Ủy nhiệm chi (UNC) | Ghi giảm tiền gửi ngân hàng |
| **Đối chiếu ngân hàng** | Bảng đối chiếu | Đối chiếu số dư sổ sách vs sao kê ngân hàng |

Liên kết đối tượng: **Khách hàng**, **Nhà cung cấp**, **Nhân viên**. TK tiền gửi mặc định = **1121**.

Footer màn hình tổng quan có 5 nút: **Tài khoản ngân hàng** · **Khách hàng** · **Nhà cung cấp** · **Nhân viên** · **Tùy chọn** (cài đặt phân hệ).

> ⚠️ **Đối chiếu ngân hàng**: liệt kê là nghiệp vụ chính nhưng **chưa có đặc tả form** (thiếu ảnh nguồn). Cần bổ sung khi có màn hình.

## 2. Danh sách thu/chi

Màn hình lưới liệt kê tất cả chứng từ thu (NTTK) + chi (UNC).

### Cột hiển thị
| Cột | Nội dung | Ghi chú |
|-----|----------|---------|
| STT / Chọn | Số thứ tự (bản xuất Excel) / Checkbox (màn hình) | Checkbox = chọn nhiều dòng |
| Ngày hạch toán | Ngày ghi sổ | |
| Ngày chứng từ | Ngày lập chứng từ | |
| Số chứng từ | Mã phiếu | Link mở chứng từ. Vd `UNC552/2026` (chi), `NTTK1432/2026` (thu) |
| Diễn giải | Nội dung thu/chi | Vd "Chi tiền cho CÔNG TY…", "Thu tiền của Anh Hải…" |
| Số tiền | Tổng tiền | Định dạng nghìn phân cách |
| Đối tượng | KH/NCC/NV | |
| Số tài khoản NH | Số TK ngân hàng | Vd `119620376666` |
| Lý do thu/chi | Loại nghiệp vụ đã chọn | = giá trị dropdown loại NV, vd "Thu khác", "Chi khác" (KHÔNG phải lý do tự nhập) |
| Loại chứng từ | Loại chứng từ | Vd "Ủy nhiệm chi" (chi), "Thu tiền gửi" (thu) |
| Chi nhánh | Chi nhánh lập chứng từ | Vd "CÔNG TY TNHH BÊ TÔNG HỒNG LĨNH" (có trong bản xuất Excel) |
| Chức năng | Nút **Xem** ▾ | Menu thao tác (không có trong bản xuất Excel) |

### Bộ lọc / thao tác
- Lọc theo khoảng ngày, loại chứng từ, đối tượng, tài khoản ngân hàng.
- Phân trang (mặc định 20 bản ghi/trang).
- Dòng được highlight khi hover/chọn.
- Dòng **Tổng cộng** cuối lưới = Σ số tiền (vd bản xuất Excel 46 bản ghi = `8.925.412.431`).

## 3. Thu tiền gửi (NTTK)

Form tạo/sửa phiếu thu tiền gửi. Tiêu đề: `Thu tiền gửi <số>`, vd `Thu tiền gửi NTTK1434/2026`.

### Chọn loại nghiệp vụ (dropdown đầu form)
Vd `7. Thu khác`. Loại quyết định định khoản mặc định.

Cạnh dropdown: ô **"Nhập số UNC từ chi nhánh khác chuyển đến"** — nhận tiền chuyển nội bộ giữa chi nhánh.

### Thông tin chung
| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Mã đối tượng | | Chọn/thêm nhanh (+) |
| Tên đối tượng | | Auto theo mã |
| Địa chỉ | | Auto theo đối tượng, vd "Xã Xuân Lộc - Hà Tĩnh" |
| Nộp vào tài khoản | ✓ | Số TK ngân hàng nhận tiền, vd `119620376666` + tên NH auto ("Ngân hàng TMCP Công Thương Việt Nam - TP Vinh") |
| Nhân viên thu nợ | | |
| Lý do thu | | Mặc định "Thu tiền của…" |
| Ngày hạch toán | ✓ | Mặc định hôm nay |
| Ngày chứng từ | ✓ | Mặc định hôm nay |
| Số chứng từ | ✓ | Auto tăng, vd `NTTK1434/2026` |
| Tham chiếu | | Link chứng từ liên quan |
| Tổng tiền | | Auto tổng dòng hạch toán, hiển thị góc phải trên |

### Bảng hạch toán
Cột: `#`, `Diễn giải`, `TK Nợ`, `TK Có`, `Số tiền`, `Đối tượng`, `Tên đối tượng`.
- TK Nợ mặc định **1121** (thu → nợ tiền gửi).
- Nút **Thêm dòng** / **Xóa hết dòng**.
- Dòng tổng cộng cuối bảng.
- Toggle **Hiển thị tài khoản** (ẩn/hiện cột TK).
- Header bảng có nút **AVA Kế toán** (AI gợi ý hạch toán) — optional.

### Ví dụ đã điền (thu công nợ KH)
- Đối tượng `KH AHAI XL` — "Anh Hải - Xuân Lộc", 40.000.000.
- TK Nợ **1121** / TK Có **131** (thu công nợ khách hàng).

### Đính kèm
Kéo/thả tệp, tối đa **5MB**.

### Nút hành động
- Khi tạo mới: `Hủy` · `Cất` · `Cất và In`. Phím tắt: `F3` tìm nhanh, `F9` thêm nhanh.
- Khi xem chứng từ đã lưu: `Sửa nhanh` · `Bỏ ghi`; footer thêm `In` · `Tiện ích`; điều hướng ◀ ▶ giữa các chứng từ; footer trái hiển thị **Chi nhánh lập chứng từ**.

## 4. Chi tiền gửi — Ủy nhiệm chi (UNC)

Form tạo/sửa chứng từ chi tiền gửi. Tiêu đề: `Ủy nhiệm chi <số>`, vd `Ủy nhiệm chi UNC553/2026`. Đảo chiều định khoản so với thu.

### Loại nghiệp vụ + phương thức thanh toán
- Dropdown loại NV: vd `3. Chi khác`.
- **Phương thức thanh toán**: vd `Ủy nhiệm chi` (dropdown riêng, cạnh loại NV).
- Checkbox **"Là UNC chuyển tiền theo lô"** (đầu form) — gộp nhiều lệnh chi trong một UNC.

### Thông tin chung
| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Tài khoản chi | ✓ | Số TK ngân hàng chi tiền, vd `119620376666` + tên NH auto |
| Mã đối tượng | | Chọn/thêm nhanh (+), vd `CTY_THAIBINH` |
| Tên đối tượng | | Auto theo mã |
| Địa chỉ | | Auto theo đối tượng |
| Tài khoản nhận | | Số TK ngân hàng người nhận |
| Nhân viên | | |
| Nội dung thanh toán | | Mặc định "Chi tiền cho…" |
| Ngày hạch toán | ✓ | Mặc định hôm nay |
| Ngày chứng từ | ✓ | Mặc định hôm nay |
| Số chứng từ | ✓ | Auto tăng, vd `UNC553/2026` |
| Tham chiếu | | |
| Tổng tiền | | Auto tổng dòng hạch toán |

### Bảng hạch toán
Cột: `#`, `Diễn giải`, `TK Nợ`, `TK Có`, `Số tiền`, `Đối tượng`, `Tên đối tượng`.
- TK Có mặc định **1121** (chi → có tiền gửi).
- Nút **Thêm dòng** / **Xóa hết dòng**, dòng tổng cộng, toggle **Hiển thị tài khoản**, nút **AVA Kế toán**.

### Ví dụ đã điền (chi trả NCC)
- Đối tượng `CTY_THAIBINH` — "CÔNG TY TNHH THƯƠNG MẠI VÀ XÂY DỰNG NAM THÁI BÌNH", 200.000.000.
- TK Nợ **331** / TK Có **1121** (chi trả công nợ nhà cung cấp).
- Footer: **Chi nhánh lập chứng từ**: "CÔNG TY TNHH BÊ TÔNG HỒNG LĨNH".

### Đính kèm
Kéo/thả tệp, tối đa **5MB**.

### Nút hành động
- Khi tạo mới: `Hủy` · `Cất` · `Cất và Thêm`. Phím tắt `F9` thêm nhanh.
- Khi xem chứng từ đã lưu: `Sửa nhanh` · `Bỏ ghi`; footer thêm `In` · `Tiện ích`; điều hướng ◀ ▶ giữa các chứng từ.

## 5. Loại chứng từ

Loại chứng từ xác định định khoản mặc định và nguồn sinh phiếu:

| Loại chứng từ | Prefix số | Ghi chú |
|---------------|-----------|---------|
| Thu tiền gửi | `NTTK####/YYYY` | Ghi tăng tiền gửi; prefix NTTK = "Nộp tiền vào tài khoản" |
| Ủy nhiệm chi | `UNC####/YYYY` | Chi tiền gửi qua lệnh chi |

Chứng từ tiền gửi cũng có thể tự sinh từ chứng từ bán hàng / mua hàng khi phương thức thanh toán = chuyển khoản (tương tự phân hệ Tiền mặt — xem `01-tien-mat.md §5`).

## 6. Báo cáo

| Mã | Báo cáo |
|----|---------|
| — | Bảng kê chứng từ theo khế ước cho vay |
| — | Bảng kê chứng từ theo khế ước vay |
| — | Bảng kê số dư ngân hàng |
| — | Bảng kê số dư tiền theo ngày |
| — | Báo cáo tổng hợp tình hình khế ước cho vay |

Ngoài ra: **Tất cả báo cáo** (menu đầy đủ).

## 7. Mô hình dữ liệu (đề xuất)

### BankVoucher (chứng từ thu/chi tiền gửi)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| type | enum | `RECEIPT` (thu/NTTK) / `PAYMENT` (chi/UNC) |
| voucherNo | string | vd `NTTK1434/2026`, `UNC553/2026` |
| voucherType | enum/ref | Loại chứng từ (§5) |
| paymentMethod | enum | Phương thức thanh toán (vd Ủy nhiệm chi) — chỉ chi |
| isBatchTransfer | bool | "Là UNC chuyển tiền theo lô" — chỉ chi |
| postingDate | date | Ngày hạch toán |
| voucherDate | date | Ngày chứng từ |
| bankAccountNo | string | TK ngân hàng của đơn vị (nộp vào / tài khoản chi) |
| bankName | string | Tên ngân hàng (auto theo TK) |
| receiverAccountNo | string | Tài khoản nhận — chỉ chi |
| partnerId | ref | Đối tượng (KH/NCC/NV) |
| partnerName | string | |
| address | string | |
| employeeId | ref | Nhân viên |
| reason | string | Lý do thu / nội dung thanh toán |
| referenceIds | ref[] | Tham chiếu |
| totalAmount | decimal | Auto tổng dòng |
| branchId | ref | Chi nhánh lập chứng từ |
| attachments | file[] | ≤5MB |

### BankVoucherLine (dòng hạch toán)
| Field | Kiểu | Ghi chú |
|-------|------|---------|
| id | uuid | |
| voucherId | ref | |
| lineNo | int | |
| description | string | Diễn giải |
| debitAccount | string | TK Nợ (thu → 1121) |
| creditAccount | string | TK Có (chi → 1121) |
| amount | decimal | Số tiền |
| partnerId | ref | Đối tượng |
| partnerName | string | |

## 8. Quy tắc nghiệp vụ

1. Số chứng từ auto tăng theo prefix + năm: thu `NTTK####/YYYY`, chi `UNC####/YYYY`.
2. Tổng tiền chứng từ = Σ số tiền dòng hạch toán.
3. Thu: TK Nợ = 1121. Chi: TK Có = 1121.
4. "Nộp vào tài khoản" (thu) / "Tài khoản chi" (chi) bắt buộc — xác định TK ngân hàng của đơn vị; tên NH auto điền theo số TK.
5. Ngày hạch toán mặc định = ngày hiện tại, cho sửa.
6. UNC hỗ trợ chuyển tiền theo lô (gộp nhiều lệnh chi) qua checkbox "Là UNC chuyển tiền theo lô".
7. Đính kèm giới hạn 5MB.
