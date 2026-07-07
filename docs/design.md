# Design — Bố cục UI

> Tài liệu bố cục (layout-only) cho ứng dụng. Chỉ mô tả **khung/bố cục**, bỏ qua style/màu sắc.

## Mục lục

1. [App Layout — Bố cục tổng thể](#1-app-layout--bố-cục-tổng-thể)
2. [Content Layout — Tổ chức vùng Content](#2-content-layout--tổ-chức-vùng-content)
3. [Table Layout — Màn hình danh sách](#3-table-layout--màn-hình-danh-sách)
4. [Login Layout — Màn hình đăng nhập](#4-login-layout--màn-hình-đăng-nhập)
5. [Record Page Layout — Trang chi tiết/chứng từ (full-page)](#5-record-page-layout--trang-chi-tiếtchứng-từ-full-page)

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
  1. Logo / brand trên cùng = **tên công ty** (logo vuông = ký tự đầu của tên; khi thu gọn chỉ còn logo).
  2. Các nhóm menu (mỗi nhóm: tiêu đề + list item; item = icon + label).
  3. Nút "Thu gọn" ghim đáy.
- Có 1 item **active** tại một thời điểm.

## 1.3. Header (top bar)

- **Vị trí**: sticky top, trong vùng Main (phải sidebar), full width vùng phải.
- **Cao**: cố định.
- **Bố cục ngang** (trái → phải):
  1. **Trái**: ô tìm kiếm toàn cục (sát trái, `mr-auto`).
  2. **Phải**: cụm icon tiện ích (thông báo, help, settings, avatar user).

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
- Dropdown **"Lọc"** — mở **filter popover** (xem [§3.7](#37-filter-popover--panel-lọc)).
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
| 7 | Chức năng | action | trái/giữa | **Row action menu** "Xem ▾" — xem [§3.8](#38-row-action-menu-cột-chức-năng) |

**Quy tắc chung:**
- Cột số (Số tiền) canh **phải**, format phân tách nghìn.
- Cột text dài (Diễn giải) cho **wrap**; cột hẹp (Đối tượng) **truncate** (…).
- Cột link (Số chứng từ) mở chi tiết chứng từ.
- Cột "Chức năng" = **row action menu** (link "Xem" + dropdown `▾`) — [§3.8](#38-row-action-menu-cột-chức-năng); **ghim phải** khi cuộn ngang.
- **Sticky cột**: table đặt `min-width` → cuộn ngang; cột "Chức năng" `sticky right-0` (nền che + bóng/viền trái, z trên cell thường). Có thể ghim thêm cột trái (checkbox/số chứng từ) tương tự với `sticky left-0`.
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
4. **Cuộn ngang** khi tổng bề rộng cột vượt viewport (table đặt `min-width` để tràn). Cột **"Chức năng" ghim phải** (`sticky right-0`) — luôn hiện khi cuộn ngang; nền che (`bg`), viền/bóng trái để tách; z cao hơn cell thường (header góc phải z cao nhất). Nền sticky cell khớp hover row (`group-hover`).
5. **Phân trang** + **page size** ở footer → reload data.
6. Lồng bên trong tab content của [§2 Content Layout](#2-content-layout--tổ-chức-vùng-content).

## 3.7. Filter popover (panel "Lọc")

> Chuẩn cho **mọi bảng danh sách**. Nút **"Lọc ▾"** ở [Toolbar §3.2](#32-toolbar) mở **popover** — panel nổi neo dưới nút, chứa các tiêu chí lọc. Chỉ mô tả bố cục.

### Sơ đồ

```
[ Lọc ▾ ]
  └────────────────────────────────────────┐
  │  <Nhãn tiêu chí 1>                       │
  │  [ dropdown ....................... ▾ ]  │
  │                                          │
  │  <Nhãn tiêu chí 2>                       │
  │  [ dropdown ....................... ▾ ]  │
  │                                          │
  │  Thời gian        Từ ngày     Đến ngày   │
  │  [ preset ▾ ]     [ date  ]   [ date  ]  │
  │                                          │
  │  [ Đặt lại ]                    [ Lọc ]  │
  └──────────────────────────────────────────┘
```

### Bố cục

- **Neo**: dưới-trái nút "Lọc", nổi trên nội dung (z cao), có bóng đổ, bo góc.
- **Mỗi tiêu chí** = nhãn đậm ở trên + control full-width ở dưới (dropdown / input), xếp dọc, cách đều.
- **Nhóm Thời gian** (1 hàng): **preset** dropdown (vd `Đầu năm đến hiện tại`, `Tháng này`, `Quý này`, `Tùy chọn`) + **Từ ngày** + **Đến ngày**. Chọn preset → tự điền 2 ngày; `Tùy chọn` → nhập tay.
- **Đáy** (1 hàng): **Đặt lại** (trái, xóa hết tiêu chí về mặc định) + **Lọc** (phải, primary, áp dụng + đóng popover).

### Hành vi

1. **Draft state**: sửa tiêu chí trong popover **chưa** áp dụng ngay; bấm **Lọc** mới apply.
2. **Đóng popover**: bấm **Lọc**, click ra ngoài, hoặc `Esc`.
3. **Áp dụng** → đẩy tiêu chí lên **URL query param** (share link, back/forward hoạt động) + về trang 1.
4. **Đặt lại**: xóa toàn bộ tiêu chí (xóa param tương ứng).
5. Số tiêu chí đang áp dụng có thể hiện badge trên nút "Lọc".

### Skeleton (React gợi ý)

```jsx
function FilterPopover({ value, onApply, onReset }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)   // draft — chưa apply
  return (
    <Popover open={open} onOpenChange={setOpen} trigger={<Button>Lọc ▾</Button>}>
      <div className="flex flex-col gap-3">
        <Field label="<Tiêu chí 1>"><Select .../></Field>
        <Field label="<Tiêu chí 2>"><Select .../></Field>
        <div className="flex gap-2">
          <Field label="Thời gian"><PresetSelect .../></Field>
          <Field label="Từ ngày"><DateInput .../></Field>
          <Field label="Đến ngày"><DateInput .../></Field>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => { setDraft(EMPTY); onReset() }}>Đặt lại</Button>
          <Button onClick={() => { onApply(draft); setOpen(false) }}>Lọc</Button>
        </div>
      </div>
    </Popover>
  )
}
```

## 3.8. Row action menu (cột "Chức năng")

> Chuẩn cho **mọi bảng danh sách**. Cột cuối "Chức năng" = **link hành động chính** + **dropdown ▾** mở menu hành động phụ. Chỉ mô tả bố cục.

### Sơ đồ

```
│ … │  Chức năng    │
│ … │  Xem  ▾       │   ← ▾ mở menu:
│ … │  Xem  ▾ ┌──────────────┐
│ … │  Xem  ▾ │  Sửa         │
│ … │  Xem  ▾ │  Nhân bản    │
│ … │  Xem  ▾ │  ──────────  │
│ … │  Xem  ▾ │  Xóa   (đỏ)  │
                └──────────────┘
```

### Bố cục

- **Link chính** ("Xem") — hành động phổ biến nhất (mở chi tiết/sửa). Style link primary.
- **Nút ▾** ngay cạnh — mở **menu dropdown** các hành động phụ (Sửa · Nhân bản · In · Xóa…).
- **Menu item**: 1 hàng/hành động, canh trái, có thể kèm icon; item **nguy hiểm** (Xóa) tô **đỏ**, tách bằng divider.
- Cột thường **ghim phải** (sticky right) khi bảng cuộn ngang.

### Hành vi

1. **Click "Xem"** → hành động chính ngay (không mở menu).
2. **Click ▾** → mở/đóng menu; chọn item → chạy hành động + đóng menu.
3. **Đóng menu**: click ra ngoài, `Esc`, hoặc khi cuộn/resize.
4. **Chống clip**: menu render **`position: fixed`** (neo theo tọa độ nút) → không bị cắt bởi `overflow` của vùng bảng; đóng khi cuộn vì fixed không trôi theo.
5. Hành động nguy hiểm (Xóa) nên **confirm** trước khi chạy.

### Skeleton (React gợi ý)

```jsx
function RowActionMenu({ primaryLabel = 'Xem', onPrimary, items }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef(null)
  const toggle = () => {
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })  // neo phải
    setOpen((v) => !v)
  }
  // đóng khi click-ngoài / Esc / scroll / resize
  return (
    <div className="flex items-center gap-1">
      <button className="text-primary" onClick={onPrimary}>{primaryLabel}</button>
      <button ref={btnRef} onClick={toggle}><ChevronDown /></button>
      {open && (
        <div style={{ position: 'fixed', top: pos.top, right: pos.right }} className="z-50 …">
          {items.map((it) => (
            <button key={it.label} onClick={() => { setOpen(false); it.onClick() }}
              className={it.danger ? 'text-red-600' : ''}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

## 3.9. Trạng thái & edge-case của bảng

> Chuẩn cho **mọi bảng danh sách**. Bố cục các trạng thái dữ liệu (loading/empty/error) và xử lý nội dung tràn. Chỉ mô tả bố cục.

### Trạng thái dữ liệu (thay phần body)

Giữ nguyên **toolbar + header cột + footer**; chỉ đổi vùng **body**. Mỗi trạng thái = **1 hàng phủ toàn bộ cột** (`colSpan` = tổng số cột), nội dung **canh giữa**, padding dọc rộng.

| Trạng thái | Body | Ghi chú |
|---|---|---|
| **Loading** | 1 hàng "Đang tải…" (hoặc skeleton rows) | Giữ khung; không nhảy layout |
| **Empty** | 1 hàng thông điệp rỗng (vd "Chưa có phiếu…") | Có thể kèm CTA tạo mới |
| **Error** | 1 hàng thông điệp lỗi + link **"Thử lại"** | Link gọi refetch |
| **Refetch** (đã có data) | Giữ data cũ, chỉ hiện spinner ở nút refresh | Dùng `keepPreviousData` — không xóa bảng khi đổi trang/lọc |

### Nội dung tràn (overflow) trong ô

- **Text dài** (Diễn giải): **wrap** tối đa 2 dòng, hoặc `truncate` + `title` (tooltip) tùy cột.
- **Cột hẹp** (Đối tượng, Lý do): `truncate` (`max-w` + `…`) + `title` full text.
- **Số** (Số tiền): `nowrap`, canh phải, không truncate.
- **Long row**: chiều cao hàng tự giãn theo nội dung wrap; **sticky cột** ([§3.6](#36-hành-vi)) vẫn hoạt động đúng khi hàng cao.

### Hành vi

1. **Loading/empty/error**: **must** giữ toolbar + header + footer cố định, chỉ thay body (tránh layout shift).
2. Hàng trạng thái **must** `colSpan` phủ hết cột, canh giữa.
3. Error **must** có hành động phục hồi (link "Thử lại").
4. Đổi trang/lọc **should** giữ data cũ (`keepPreviousData`) để không nháy.

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

---

# 5. Record Page Layout — Trang chi tiết/chứng từ (full-page)

> Chuẩn cho **Xem / Sửa / Tạo** một bản ghi (chứng từ, đối tượng…). Thay cho modal: mở **trang riêng full-page** theo route (vd `/purchase/vouchers/:id`, `/purchase/vouchers/new`). Trang chiếm **toàn màn** (đè cả Sidebar/Header của [§1 App Layout](#1-app-layout--bố-cục-tổng-thể)), tối ưu cho biểu mẫu nhiều trường + bảng dòng hàng. Chỉ mô tả bố cục, bỏ qua style/màu sắc.

## 5.1. Sơ đồ khung

```
┌──────────────────────────────────────────────────────────────────────┐
│  PAGE HEADER  (⟲ · Tiêu đề+số CT · dropdown loại · tra cứu | trợ giúp ⌨ ⚙ ✕) │ ← sticky top
├──────────────────────────────────────────────────────────────────────┤
│  SUB HEADER  (○ radio trạng thái · dropdown · …          Tổng tiền TT ▓) │
├──────────────────────────────────────────────────────────────────────┤
│  TABS  (Phiếu nhập | Hóa đơn)                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  FORM BODY  (lưới trường thông tin — nhiều cột)                        │  ← cuộn dọc
│                                                                        │
│  ── LINE SECTION ──────────────────────────────────────────────────   │
│  [Hàng tiền | Chi phí]                         toolbar dòng · summary   │
│  ┌──────────── bảng dòng hàng (cuộn ngang) ────────────┐   Tổng tiền hàng │
│  │  # · Mã · Tên · Kho · TK … · SL · Đơn giá · …        │   Thuế GTGT      │
│  └──────────────────────────────────────────────────────┘   Tổng TT / …  │
│  [Thêm dòng] [Thêm ghi chú] [Xóa hết dòng]                             │
│                                                                        │
├──────────────────────────────────────────────────────────────────────┤
│  ACTION BAR  (⟨ ⟩ · phụ trợ   |  In · Tiện ích · toggle  |  Sửa nhanh · Cất/Bỏ ghi) │ ← sticky bottom
└──────────────────────────────────────────────────────────────────────┘
```

- **3 tầng cố định**: Page header (sticky top) + Action bar (sticky bottom) + phần thân giữa cuộn dọc.
- Thân giữa gồm: **Sub-header** → **Tabs** → **Form body** (lưới trường) → **Line section** (bảng dòng hàng + summary).

## 5.2. Page header (thanh trên)

Một hàng ngang, trái → phải:
- **Trái**: icon lịch sử/⟲ + **tiêu đề + số chứng từ** (vd `Chứng từ mua hàng NK07098`) + dropdown **loại nghiệp vụ** (vd `Mua hàng trong nước nhập kho`) + ô tra cứu (số hợp đồng…).
- **Phải**: link `Hướng dẫn sử dụng` + icon bàn phím (phím tắt) + icon ⚙ (cấu hình) + **✕ đóng** (thoát về danh sách).
- Chế độ **Xem**: các control chỉ đọc; chế độ **Sửa/Tạo**: cho nhập.

## 5.3. Sub-header (dải trạng thái + tổng tiền)

- **Trái**: nhóm control quyết định định khoản/luồng — radio (`Chưa thanh toán` / `Thanh toán ngay`) + dropdown (phương thức TT, `Nhận kèm hóa đơn`…).
- **Phải**: **Tổng tiền thanh toán** cỡ lớn (số nổi bật), cập nhật realtime theo dòng hàng.

## 5.4. Tabs bản ghi

- Hàng tab ngay dưới sub-header (vd `Phiếu nhập | Hóa đơn`), 1 tab active. Đổi tab → đổi vùng form body (không rời trang).

## 5.5. Form body (lưới trường)

- **Lưới nhiều cột** (thường 3 cụm): mỗi trường = nhãn trên + control dưới. Nhóm liên quan xếp cùng cột (vd: NCC | địa chỉ/diễn giải | ngày+số CT).
- Trường mở rộng (dropdown có nút `+` thêm nhanh đối tượng, icon tra cứu…) theo nhu cầu nghiệp vụ.
- **Chế độ Xem** = toàn bộ `fieldset disabled` (chỉ đọc, mờ nhẹ); **Sửa/Tạo** = bật nhập.

## 5.6. Line section (bảng dòng hàng)

- **Sub-tabs** trái (vd `Hàng tiền | Chi phí`) + toolbar phải (chọn sổ, `Chiết khấu`…).
- **Bảng dòng hàng**: cột `# · Mã hàng · Tên hàng · Kho · TK Kho · TK Công nợ · ĐVT · SL · Đơn giá · …` — cuộn ngang khi rộng; total row cộng cột số. Cột tài khoản (TK Kho/CN/thuế) ẩn/hiện theo toggle "Hiển thị tài khoản" ở action bar.
- **Nút dòng**: `Thêm dòng` · `Thêm ghi chú` · `Xóa hết dòng`.
- **Summary (phải)**: `Tổng tiền hàng` · `Thuế GTGT` · `Tổng tiền thanh toán` · `Chi phí mua hàng` · `Giá trị nhập kho` — khối số canh phải, khớp Tổng ở sub-header.

## 5.7. Action bar (thanh đáy sticky)

Một hàng, 3 cụm:
- **Trái**: điều hướng bản ghi trước/sau (`⟨ ⟩`) + hành động phụ trợ theo nghiệp vụ (vd `Lập phiếu xuất thẳng`).
- **Giữa**: `In ▾` · `Tiện ích` · toggle `Hiển thị tài khoản`.
- **Phải**: nút phụ (`Sửa nhanh`) + **nút primary chính** (`Cất` / `Cất và Thêm` khi tạo; `Bỏ ghi` khi xem bản ghi đã ghi sổ).

## 5.8. Chế độ (mode)

| Mode | Route | Trường | Action bar chính |
|---|---|---|---|
| **Tạo** | `/…/new` | nhập được | `Cất` / `Cất và Thêm` |
| **Sửa** | `/…/:id/edit` (hoặc `:id?edit`) | nhập được | `Cất` |
| **Xem** | `/…/:id` | chỉ đọc (`fieldset disabled`) | `Sửa` / `Bỏ ghi`; ✕ đóng |

## 5.9. Skeleton (React gợi ý)

```jsx
function RecordPage({ mode }) {           // 'new' | 'edit' | 'view'
  const navigate = useNavigate()
  const close = () => navigate('..')       // quay lại danh sách
  const readOnly = mode === 'view'
  return (
    <div className="flex h-screen flex-col">
      {/* Page header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <button onClick={close} aria-label="Lịch sử">⟲</button>
        <h1 className="font-bold">Chứng từ … <span>{code}</span></h1>
        <TypeSelect />
        <div className="ml-auto flex items-center gap-2">
          <HelpLink /> <ShortcutBtn /> <SettingsBtn />
          <button onClick={close} aria-label="Đóng">✕</button>
        </div>
      </header>

      {/* Sub-header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2">
        <StatusRadios /> <PaymentSelect />
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Tổng tiền thanh toán</div>
          <div className="text-3xl font-bold">{formatCurrency(total)}</div>
        </div>
      </div>

      {/* Tabs + body cuộn */}
      <RecordTabs tabs={['Phiếu nhập', 'Hóa đơn']} />
      <form className="flex-1 overflow-y-auto p-4">
        <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-90">
          <FieldGrid />              {/* lưới trường §5.5 */}
          <LineSection />            {/* bảng dòng hàng + summary §5.6 */}
        </fieldset>
      </form>

      {/* Action bar */}
      <footer className="flex h-14 shrink-0 items-center border-t px-4">
        <RecordNav /> {/* ⟨ ⟩ + phụ trợ */}
        <div className="mx-auto flex items-center gap-3">
          <PrintMenu /> <UtilsMenu /> <AccountsToggle />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline">Sửa nhanh</Button>
          <Button>{mode === 'view' ? 'Bỏ ghi' : 'Cất'}</Button>
        </div>
      </footer>
    </div>
  )
}
```

## 5.10. Hành vi

1. **Route-based**: mỗi bản ghi có URL riêng (share link, back/forward, refresh giữ nguyên) — thay cho modal.
2. **Full-page**: đè Sidebar/Header; **✕ đóng** hoặc back → về danh sách ([§3 Table Layout](#3-table-layout--màn-hình-danh-sách)).
3. **Sticky**: page header + action bar cố định; chỉ thân giữa cuộn.
4. **Sub-header ↔ line**: đổi trạng thái/dòng hàng → tính lại **Tổng tiền thanh toán** + summary realtime.
5. **Chế độ Xem**: `fieldset disabled` toàn form; nút chính đổi sang `Sửa`/`Bỏ ghi`.
6. **Điều hướng trước/sau** (`⟨ ⟩`): nhảy sang bản ghi liền kề trong danh sách hiện tại (giữ filter).
7. Row action ([§3.8](#38-row-action-menu-cột-chức-năng)) "Xem"/"Sửa" và nút "Thêm" ở toolbar ([§3.2](#32-toolbar)) **điều hướng sang trang này** thay vì mở modal.
