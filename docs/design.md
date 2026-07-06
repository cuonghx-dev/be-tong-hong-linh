# Design — Bố cục UI

> Tài liệu bố cục (layout-only) cho ứng dụng. Chỉ mô tả **khung/bố cục**, bỏ qua style/màu sắc.

## Mục lục

1. [App Layout — Bố cục tổng thể](#1-app-layout--bố-cục-tổng-thể)
2. [Content Layout — Tổ chức vùng Content](#2-content-layout--tổ-chức-vùng-content)
3. [Table Layout — Màn hình danh sách](#3-table-layout--màn-hình-danh-sách)
4. [Login Layout — Màn hình đăng nhập](#4-login-layout--màn-hình-đăng-nhập)

---

# 1. App Layout — Bố cục tổng thể

> Khung layout chung của ứng dụng. Chỉ mô tả **bố cục 3 vùng**: Header, Sidebar, Content. Bỏ qua style/màu sắc.

## 1.1. Sơ đồ khung

```
┌────────────┬──────────────────────────────────────────────┐
│            │  HEADER (top bar, full width vùng phải)        │
│  SIDEBAR   ├──────────────────────────────────────────────┤
│  (trái,    │                                                │
│   full     │  CONTENT                                       │
│   height)  │  (vùng cuộn chính)                             │
│            │                                                │
└────────────┴──────────────────────────────────────────────┘
```

- **Grid tổng**: 2 cột — Sidebar (rộng cố định) + Main (flex-1).
- **Main** chia dọc: Header (cao cố định, sticky top) + Content (flex-1, cuộn dọc).
- Chiều cao app = `100vh`; chỉ **Content** cuộn, Header & Sidebar cố định.

## 1.2. Sidebar (trái)

- **Vị trí**: cố định trái, cao full `100vh`.
- **Rộng**: cố định; thu gọn (collapse) còn chế độ icon-only qua nút "Thu gọn" ở đáy.
- **Cuộn**: độc lập khi menu dài.
- **Bố cục dọc**:
  1. Logo / brand trên cùng.
  2. Nút action "+ Thêm nhanh".
  3. Các nhóm menu (mỗi nhóm: tiêu đề + list item; item = icon + label).
  4. Nút "Thu gọn" ghim đáy.
- Có 1 item **active** tại một thời điểm.

## 1.3. Header (top bar)

- **Vị trí**: sticky top, trong vùng Main (phải sidebar), full width vùng phải.
- **Cao**: cố định.
- **Bố cục ngang** (trái → phải):
  1. **Trái**: brand/logo + context (tên công ty, kỳ dữ liệu) + dropdown.
  2. **Giữa**: ô tìm kiếm toàn cục.
  3. **Phải**: cụm icon tiện ích (thông báo, help, settings, avatar user).

## 1.4. Content (vùng chính)

- **Vị trí**: dưới Header, phải Sidebar. `flex-1`, cuộn dọc.
- Là nơi mount từng màn hình (routes).
- Bên trong content thường tổ chức theo pattern **tabs trên + content dưới** — xem [§2 Content Layout](#2-content-layout--tổ-chức-vùng-content).

## 1.5. Skeleton (React gợi ý)

```jsx
function AppShell({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />                     {/* rộng cố định, collapsible */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />                    {/* cao cố định, sticky top */}
        <main className="flex-1 overflow-y-auto">
          {children}                  {/* route content mount here */}
        </main>
      </div>
    </div>
  );
}
```

## 1.6. Hành vi

1. **Sticky**: Sidebar + Header cố định; chỉ Content cuộn.
2. **Collapse sidebar**: nút "Thu gọn" → icon-only; Content tự giãn.
3. **Responsive**: màn hẹp → sidebar chuyển thành overlay/drawer.

---

# 2. Content Layout — Tổ chức vùng Content

> Bổ sung cho [§1 App Layout](#1-app-layout--bố-cục-tổng-thể). Bên trong vùng **Content** của mỗi phân hệ: một thanh **Tabs** ở trên + vùng **Content dưới** đổi theo tab. Bỏ qua style/màu sắc, chỉ bố cục.

## 2.1. Sơ đồ

```
┌──────────────────────────────────────────────────────────┐
│  TABS BAR  (Quy trình | Đề nghị chi tiền | … | Báo cáo)   │  ← sticky top
├──────────────────────────────────────────────────────────┤
│                                                            │
│  TAB CONTENT  (đổi theo tab active)                        │  ← cuộn
│                                                            │
└──────────────────────────────────────────────────────────┘
```

- **Tabs bar**: hàng ngang trên cùng vùng content, sticky.
- **Tab content**: vùng dưới, chiếm phần còn lại, cuộn dọc, render theo tab đang chọn.
- Mỗi phân hệ (Tiền mặt, Kho, Bán hàng…) có bộ tab riêng.

## 2.2. Tabs bar

- **Vị trí**: trên cùng vùng content, full width, sticky.
- **Tab item**: label chữ, canh trái, cách đều.
- Có 1 tab **active** tại một thời điểm (highlight).
- **Phải thanh tab**: cụm icon tiện ích của phân hệ (help/AI, settings/list…).

Ví dụ tab (phân hệ Tiền mặt):
`Quy trình | Đề nghị chi tiền | Thu, chi tiền | Đề nghị quyết toán tạm ứng | Kiểm kê | Dự báo dòng tiền | Báo cáo`

## 2.3. Tab content

- **Vị trí**: dưới tabs bar, `flex-1`, cuộn dọc.
- Nội dung tùy tab: **danh sách/bảng** (tab "Thu, chi tiền"), **màn hình quy trình** (tab "Quy trình"), hoặc form.
- Bố cục nội dung từng tab **không cố định** — file này chỉ chuẩn hóa khung *tabs trên + content dưới*.

### Ví dụ tab "Quy trình" (bố cục dashboard)

2 cột + banner dưới:
- **Cột trái (lớn)**: panel `NGHIỆP VỤ …` — sơ đồ flow (Thu tiền → Kiểm kê quỹ → …, Chi tiền), dưới là hàng shortcut icon (`Khách hàng | Nhà cung cấp | Nhân viên | Tùy chọn`).
- **Cột phải (nhỏ)**: panel `BÁO CÁO` — list link báo cáo, footer link `Tất cả báo cáo`.
- **Dưới cùng (full width)**: banner tính năng (vd `AMIS Quy trình` + nút `Xem tính năng` / `Kết nối ngay`).

## 2.4. Skeleton (React gợi ý)

```jsx
function ModuleContent({ tabs, activeTab, onTab, children }) {
  return (
    <div className="flex h-full flex-col">
      {/* Tabs bar */}
      <div className="sticky top-0 z-10 flex items-center">
        <nav className="flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onTab(t.key)}
              aria-selected={t.key === activeTab}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex">{/* module icons */}</div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
```

## 2.5. Hành vi

1. **Sticky tabs**: thanh tab cố định; chỉ tab content cuộn.
2. **Đổi tab**: click → đổi active + render content tương ứng (đồng bộ URL/route nếu có).
3. Vùng content này lồng bên trong Content của [§1 App Layout](#1-app-layout--bố-cục-tổng-thể) (dưới Header, phải Sidebar).

---

# 3. Table Layout — Màn hình danh sách

> Bổ sung cho [§2 Content Layout](#2-content-layout--tổ-chức-vùng-content). Dùng cho các tab dạng **danh sách**. Gồm 3 tầng dọc: **Toolbar** trên + **Table** giữa + **Footer** dưới. Bỏ qua style, chỉ bố cục.

## 3.1. Sơ đồ

```
┌──────────────────────────────────────────────────────────────┐
│  TOOLBAR  (bulk actions · filter · actions · search)          │  ← sticky
├──────────────────────────────────────────────────────────────┤
│  TABLE HEADER  (cột)                                           │  ← sticky
├──────────────────────────────────────────────────────────────┤
│  TABLE BODY  (rows)                                            │  ← cuộn dọc + ngang
├──────────────────────────────────────────────────────────────┤
│  TOTAL ROW  (Tổng + cộng cột số)                               │  ← sticky bottom (trên footer)
├──────────────────────────────────────────────────────────────┤
│  FOOTER  (tổng số bản ghi · page size · phân trang)           │
└──────────────────────────────────────────────────────────────┘
```

- Body cuộn dọc; nếu bảng rộng → cuộn ngang (scrollbar dưới cùng).
- Header cột + toolbar + total row + footer cố định; chỉ body cuộn.

## 3.2. Toolbar

Một hàng ngang. Có thể tràn 2 cụm (cụm action trái, cụm tiện ích phải). Trái → phải:

**Cụm trái:**
- Icon export/collapse (nút vuông).
- Dropdown **"Thực hiện hàng loạt"** — disabled khi chưa tick dòng, bật khi có dòng chọn.
- Dropdown **"Lọc"**.
- Dropdown trạng thái/loại (vd "Tất cả").
- Label kỳ thời gian (vd "Đầu năm tới hiện tại").

**Cụm phải:**
- Nút primary chính (vd split-button "Thu tiền", "Chi tiền" — phần chính + mũi tên dropdown).
- Nút primary phụ (vd "Thêm bằng AI").
- Ô tìm kiếm + icon AI.
- Icon refresh.
- Icon xuất Excel.
- Icon settings (cấu hình cột/bảng).

## 3.3. Table

### Cấu trúc cột (trái → phải, ví dụ tab "Thu, chi tiền")

| # | Cột | Kiểu | Canh | Ghi chú |
|---|---|---|---|---|
| 1 | ☐ checkbox | select | giữa | header có "chọn tất cả" |
| 2 | Ngày hạch toán | date | trái | |
| 3 | Số chứng từ | text link | trái | click mở chi tiết |
| 4 | Diễn giải | text (wrap 2 dòng) | trái | cột co giãn rộng nhất |
| 5 | Số tiền | number | **phải** | định dạng nghìn `.` |
| 6 | Đối tượng | text (truncate) | trái | |
| 7 | Chức năng | action | trái/giữa | link "Xem" + mũi tên dropdown |

**Quy tắc chung:**
- Cột số (Số tiền) canh **phải**, format phân tách nghìn.
- Cột text dài (Diễn giải) cho **wrap**; cột hẹp (Đối tượng) **truncate** (…).
- Cột link (Số chứng từ) mở chi tiết chứng từ.
- Cột "Chức năng" = link hành động chính ("Xem") + dropdown `▾` cho hành động khác.
- Row hover highlight; tick checkbox → bật "Thực hiện hàng loạt".

### Total row

- Một dòng cố định ngay trên footer.
- Ô đầu label **"Tổng"**; các cột số hiện tổng cộng (vd cột Số tiền → `151.933.876.437`).
- Cột không cộng để trống.

## 3.4. Footer

Một hàng, trái → phải:
- **Trái**: `Tổng số: N bản ghi` (vd `4.066`).
- **Phải**: dropdown page size (`20 bản ghi trên 1 trang`) + phân trang (`Trước 1 2 3 … 204 Sau`, trang hiện tại active).

Dưới cùng (khi bảng rộng): thanh cuộn ngang + tay cầm `▲` (mở panel chi tiết/preview).

## 3.5. Skeleton (React gợi ý)

```jsx
function DataListView({ columns, rows, totals, page, pageCount, total }) {
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2">
        <BulkActions disabled={!hasSelection} />
        <FilterDropdown />
        <StatusDropdown />
        <PeriodLabel>Đầu năm tới hiện tại</PeriodLabel>
        <div className="ml-auto flex items-center gap-2">
          <SplitButton>Thu tiền</SplitButton>
          <SplitButton>Chi tiền</SplitButton>
          <Button>Thêm bằng AI</Button>
          <SearchInput />
          <IconButton icon="refresh" />
          <IconButton icon="excel" />
          <IconButton icon="settings" />
        </div>
      </div>

      {/* Table (cuộn dọc + ngang) */}
      <div className="flex-1 overflow-auto">
        <table>
          <thead className="sticky top-0">{/* columns */}</thead>
          <tbody>{/* rows */}</tbody>
          <tfoot className="sticky bottom-0">{/* total row */}</tfoot>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center">
        <span>Tổng số: {total} bản ghi</span>
        <div className="ml-auto flex items-center gap-2">
          <PageSizeSelect />
          <Pagination page={page} pageCount={pageCount} />
        </div>
      </div>
    </div>
  );
}
```

## 3.6. Hành vi

1. **Sticky**: toolbar + header cột + total row + footer cố định; chỉ body cuộn.
2. **Chọn dòng**: tick checkbox (hoặc "chọn tất cả") → bật "Thực hiện hàng loạt".
3. **Cột số** canh phải + format nghìn; **total row** cộng cột số.
4. **Cuộn ngang** khi tổng bề rộng cột vượt viewport.
5. **Phân trang** + **page size** ở footer → reload data.
6. Lồng bên trong tab content của [§2 Content Layout](#2-content-layout--tổ-chức-vùng-content).

---

# 4. Login Layout — Màn hình đăng nhập

> Màn hình **standalone** (không dùng App Shell của [§1 App Layout](#1-app-layout--bố-cục-tổng-thể) — không có Sidebar/Header). Full màn, ảnh nền phủ toàn trang, thẻ đăng nhập canh giữa. Chỉ mô tả bố cục, bỏ qua màu sắc.

## 4.1. Sơ đồ khung

```
┌──────────────────────────────────────────────────────────────┐
│  BACKGROUND (ảnh phủ full viewport)          [Ngôn ngữ | Trợ giúp] │ ← top-right
│                                                                │
│              ┌──────────────────┬──────────────────┐          │
│              │                  │                   │          │
│              │  PANEL TRÁI      │  PANEL PHẢI       │          │
│              │  (brand /        │  (form đăng nhập) │  ← card  │
│              │   marketing)     │                   │  giữa    │
│              │                  │                   │          │
│              └──────────────────┴──────────────────┘          │
│                                                                │
│                    FOOTER (copyright, canh giữa)               │ ← bottom
└──────────────────────────────────────────────────────────────┘
```

- **Nền**: ảnh phủ full `100vh` × `100vw`, `object-cover`.
- **Overlay top-right**: cụm `[Ngôn ngữ] | [Trợ giúp]`.
- **Card giữa**: chia **2 panel ngang** — trái (brand/marketing) + phải (form). Canh giữa theo cả 2 chiều.
- **Footer**: dòng copyright canh giữa đáy trang.
- Màn hẹp: panel trái ẩn, chỉ còn panel phải (form).

## 4.2. Overlay top-right

- **Vị trí**: góc trên-phải, nổi trên nền.
- **Nội dung**: dropdown ngôn ngữ (cờ + `Việt Nam`) · phân cách `|` · link `Trợ giúp` (icon `?`).

## 4.3. Panel trái (brand / marketing)

- **Vị trí**: nửa trái card.
- **Bố cục dọc** (trên → dưới):
  1. Logo sản phẩm trên cùng.
  2. Badge nhỏ (vd `NỀN TẢNG`).
  3. Tiêu đề marketing lớn (vd `QUẢN TRỊ DOANH NGHIỆP HỢP NHẤT`).
  4. Hình minh họa / mascot ở giữa.
- Thuần trang trí; **ẩn ở màn hẹp**.

## 4.4. Panel phải (form đăng nhập)

- **Vị trí**: nửa phải card.
- **Bố cục dọc** (trên → dưới):
  1. **Logo hãng** trên cùng.
  2. **Tiêu đề** `Đăng nhập`.
  3. **Tabs phương thức**: `Với mật khẩu` | `Với mã QR` (1 tab active).
  4. **Form** (tab "Với mật khẩu"):
     - Input `Số điện thoại/email`.
     - Input `Mật khẩu` + icon toggle ẩn/hiện (con mắt).
     - Nút primary full-width `Đăng nhập`.
  5. **Hàng link**: `Quên mật khẩu?` (trái) · `Đăng ký` (phải).
  6. **Divider** `Hoặc đăng nhập với`.
  7. **Social login**: hàng icon tròn (Google · Apple · Microsoft).

- Tab `Với mã QR`: thay vùng form (4) bằng ảnh QR + hướng dẫn quét.

## 4.5. Footer

- Một dòng canh giữa đáy trang, nổi trên nền.
- Nội dung: `Copyright © 2012 – 2026 <Công ty>`.

## 4.6. Skeleton (React gợi ý)

```jsx
function LoginScreen() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />

      {/* Overlay top-right */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageDropdown />
        <span>|</span>
        <HelpLink />
      </div>

      {/* Card giữa: 2 panel */}
      <div className="relative z-10 flex overflow-hidden rounded-2xl shadow-xl">
        <aside className="hidden w-80 flex-col md:flex">
          {/* Panel trái: logo + badge + tiêu đề + mascot */}
        </aside>

        <section className="flex w-96 flex-col">
          {/* Panel phải: form */}
          <BrandLogo />
          <h1>Đăng nhập</h1>
          <Tabs items={["Với mật khẩu", "Với mã QR"]} />
          <form className="flex flex-col gap-3">
            <input placeholder="Số điện thoại/email" />
            <PasswordInput placeholder="Mật khẩu" />
            <button type="submit">Đăng nhập</button>
          </form>
          <div className="flex justify-between">
            <a>Quên mật khẩu?</a>
            <a>Đăng ký</a>
          </div>
          <Divider>Hoặc đăng nhập với</Divider>
          <SocialLogins providers={["google", "apple", "microsoft"]} />
        </section>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center">
        Copyright © 2012 – 2026 …
      </footer>
    </div>
  );
}
```

## 4.7. Hành vi

1. **Standalone**: không render Sidebar/Header; đăng nhập thành công → điều hướng vào App Shell ([§1 App Layout](#1-app-layout--bố-cục-tổng-thể)).
2. **Đổi tab phương thức**: `Với mật khẩu` ↔ `Với mã QR` → đổi vùng form.
3. **Toggle mật khẩu**: icon con mắt ẩn/hiện text mật khẩu.
4. **Social login**: click provider → luồng OAuth tương ứng.
5. **Responsive**: màn hẹp ẩn panel trái, chỉ còn form; card co full width.
