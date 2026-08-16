# Triển khai trên Windows Server

Hướng dẫn cài đặt Kế toán SME trên máy chủ Windows Server 2019/2022/2025, chạy **native** (không Docker Desktop — bản Server không có, và Docker trên Windows tốn RAM gấp đôi).

Cấu hình phần cứng cần có: [hardware-requirements.md](hardware-requirements.md).

Kiến trúc sau khi cài:

```
Trình duyệt  ──:8080──►  ketoan-web (Node, scripts/windows/web-server.cjs)
                              │  serve apps/web/dist  (SPA fallback)
                              └─ proxy /api ──:3000──►  ketoan-api (NestJS)
                                                              │
                                                        PostgreSQL 16 :5432
```

Cả hai tiến trình do **pm2** quản lý, pm2 chạy như Windows Service để tự khởi động lại sau reboot.
Web và API chung origin `:8080` nên `VITE_API_URL=/api` dùng được, không phụ thuộc CORS.

---

## 1. Chuẩn bị máy chủ

1. Đăng nhập bằng tài khoản Administrator.
2. Cập nhật Windows, đặt múi giờ **(UTC+07:00) Bangkok, Hanoi, Jakarta**.
   Ngày chứng từ lưu theo giờ máy chủ — sai múi giờ làm lệch kỳ kế toán.
3. Tạo thư mục cài đặt, ví dụ `C:\apps\ke-toan-SME`.
4. Chép mã nguồn lên (chọn 1 trong 2):
   - `git clone <repo-url> C:\apps\ke-toan-SME` (nên dùng — nâng cấp bằng `git pull`)
   - Copy thư mục qua RDP / robocopy, **loại trừ** `node_modules`, `dist`, `.git`.

Mọi lệnh PowerShell dưới đây chạy trong cửa sổ **Run as Administrator**, tại `C:\apps\ke-toan-SME`.

Nếu PowerShell chặn script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## 2. Cài phần mềm nền

```powershell
.\scripts\windows\install-prereqs.ps1
```

Script cài (idempotent, bỏ qua cái đã có): **Node.js 20 LTS**, **pnpm 9** (qua corepack), **PostgreSQL 16**, **pm2**.
Trình cài PostgreSQL sẽ hỏi mật khẩu superuser `postgres` — **ghi lại**.

Không có `winget` (Windows Server Core cũ): tải thủ công
[Node 20 LTS MSI](https://nodejs.org/en/download) và
[PostgreSQL 16 EDB installer](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads),
rồi `corepack enable; corepack prepare pnpm@9.7.0 --activate; npm i -g pm2`.

Kiểm tra:

```powershell
node -v      # v20.x trở lên
pnpm -v      # 9.7.0
pm2 -v
psql --version
```

`psql` không nhận diện → thêm `C:\Program Files\PostgreSQL\16\bin` vào PATH hệ thống.

## 3. Tạo database + file .env

```powershell
.\scripts\windows\setup-database.ps1 -DbPassword 'MatKhauManh#2026'
```

Script làm:

- tạo role `ketoan` + database `ketoan_sme` (UTF8, owner `ketoan`);
- sinh `apps\api\.env` với `DATABASE_URL`, `API_PORT=3000` và **JWT secret ngẫu nhiên 48 ký tự**;
- sinh `apps\web\.env.production` với `VITE_API_URL=/api`.

Cả hai file nằm trong `.gitignore` — không commit.
DB đặt trên máy khác: thêm `-DbHost <ip> -DbPort 5432`.
Ghi đè file `.env` sẵn có: thêm `-Force` (sẽ đổi JWT secret → mọi người dùng phải đăng nhập lại).

## 4. Build + chạy

Lần đầu (có nạp danh mục ban đầu):

```powershell
.\scripts\windows\deploy.ps1 -Seed
```

Các lần sau (nâng cấp):

```powershell
git pull
.\scripts\windows\deploy.ps1
```

`deploy.ps1` chạy tuần tự: `pnpm install --frozen-lockfile` → `prisma generate` → `prisma migrate deploy` → `pnpm build` → `pm2 startOrReload`.

Về `-Seed`: chạy `prisma db seed`, nạp danh mục từ `apps/api/prisma/initial-databases/betonghonglinh` (tài khoản, đối tượng, vật tư — **không** nạp chứng từ) và tạo user `admin@ketoan.vn`. Mật khẩu lấy từ biến môi trường `INITIAL_DB_ADMIN_PASSWORD`, mặc định `admin123`:

```powershell
$env:INITIAL_DB_ADMIN_PASSWORD = 'MatKhauAdmin#2026'
.\scripts\windows\deploy.ps1 -Seed
```

**Đổi mật khẩu admin ngay sau lần đăng nhập đầu tiên.** Seed idempotent, chạy lại không nhân đôi dữ liệu, nhưng chỉ cần `-Seed` lần đầu.

Kiểm tra:

```powershell
pm2 status          # ketoan-api + ketoan-web phải "online"
pm2 logs ketoan-api --lines 50
```

- Web: `http://<ip-máy-chủ>:8080`
- Swagger: `http://<ip-máy-chủ>:8080/api/docs`

## 5. Cho pm2 tự chạy sau khi reboot

pm2 trên Windows không có `pm2 startup` như Linux. Dùng `pm2-installer` (khuyến nghị):

```powershell
# Tải https://github.com/jessety/pm2-installer → giải nén → trong thư mục đó:
npm run configure
npm run configure-policy
npm run setup
```

Sau đó lưu danh sách tiến trình hiện tại vào dump của service:

```powershell
pm2 save
```

Kiểm tra: `Get-Service pm2.exe` phải `Running`. Reboot thử một lần rồi `pm2 status`.

Cách thay thế — [NSSM](https://nssm.cc/): tạo service chạy trực tiếp
`node C:\apps\ke-toan-SME\apps\api\dist\main.js` và
`node C:\apps\ke-toan-SME\scripts\windows\web-server.cjs`, bỏ pm2 hoàn toàn.

## 6. Tường lửa & HTTPS

Chỉ mở cổng web, chặn API và Postgres từ ngoài:

```powershell
New-NetFirewallRule -DisplayName "Ketoan SME Web" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
# API/DB chỉ dùng nội bộ máy chủ:
New-NetFirewallRule -DisplayName "Block Ketoan API tu ngoai" -Direction Inbound -Protocol TCP -LocalPort 3000 -RemoteAddress Any -Action Block
New-NetFirewallRule -DisplayName "Block Postgres tu ngoai"  -Direction Inbound -Protocol TCP -LocalPort 5432 -RemoteAddress Any -Action Block
```

> Cảnh báo bảo mật: NestJS lắng nghe trên mọi interface (`app.listen(port)`), nên nếu không có rule chặn cổng 3000, toàn bộ API truy cập được trực tiếp từ mạng ngoài, bỏ qua lớp web. Đừng bỏ hai rule Block ở trên.

**Truy cập ngoài LAN thì bắt buộc HTTPS** — JWT nằm trong header `Authorization`, không TLS là lộ token. Hai cách:

**a) IIS làm reverse proxy** (cần Application Request Routing + URL Rewrite):
1. Cài IIS role → cài [ARR](https://www.iis.net/downloads/microsoft/application-request-routing) và [URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite).
2. Tạo site trống, bind 443 với chứng chỉ.
3. URL Rewrite → rule inbound: pattern `(.*)` → rewrite `http://localhost:8080/{R:1}`, type `Rewrite`.
4. Đóng 8080 khỏi firewall, chỉ mở 443.

**b) Caddy** (đơn giản hơn, tự xin/gia hạn Let's Encrypt) — `Caddyfile`:

```
ketoan.congty.vn {
    reverse_proxy 127.0.0.1:8080
}
```

## 7. Backup & phục hồi

Đặt lịch backup hằng ngày lúc 01:00:

```powershell
schtasks /Create /SC DAILY /ST 01:00 /RU SYSTEM /TN "KetoanSME-Backup" `
  /TR "powershell -ExecutionPolicy Bypass -File C:\apps\ke-toan-SME\scripts\windows\backup-db.ps1"
```

`backup-db.ps1` chạy `pg_dump -Fc` vào `D:\backup\ketoan-sme`, tự xóa bản cũ hơn 30 ngày (`-KeepDays`).
Mật khẩu DB lấy từ `%PGPASSWORD%` hoặc `%APPDATA%\postgresql\pgpass.conf` (bắt buộc, vì Task Scheduler chạy không tương tác).

Phục hồi:

```powershell
pm2 stop ketoan-api
pg_restore -h localhost -U postgres -d ketoan_sme --clean --if-exists D:\backup\ketoan-sme\ketoan_sme-20260816-010000.dump
pm2 start ketoan-api
```

Định kỳ **kiểm thử phục hồi lên DB tạm** — bản backup chưa restore thử coi như chưa có backup.

## 8. Nâng cấp

```powershell
.\scripts\windows\backup-db.ps1          # backup trước — migration không rollback tự động
git pull
.\scripts\windows\deploy.ps1
pm2 logs --lines 50
```

`prisma migrate deploy` chỉ áp dụng migration đã commit; không tự sinh, không reset dữ liệu.
Nếu DB tạo trước khi có thư mục `migrations` (dữ liệu có sẵn, bảng `_prisma_migrations` trống) thì phải baseline trước, nếu không `migrate deploy` sẽ báo lỗi bảng đã tồn tại:

```powershell
pnpm --filter @app/api exec prisma migrate resolve --applied 20260812000000_init
```

Quay lui bản cũ: `git checkout <tag-cũ>` → `deploy.ps1` → nếu migration mới đã đổi schema thì phải `pg_restore` bản backup tương ứng.

## 9. Vận hành hằng ngày

| Việc | Lệnh |
|---|---|
| Trạng thái | `pm2 status` |
| Log API cuộn theo thời gian thực | `pm2 logs ketoan-api` |
| Khởi động lại API | `pm2 restart ketoan-api` |
| Khởi động lại tất cả | `pm2 restart all` |
| Dùng bao nhiêu RAM/CPU | `pm2 monit` |
| Xoay vòng log | `pm2 install pm2-logrotate` |

File log ghi ở `C:\apps\ke-toan-SME\logs\` (`api-out.log`, `api-err.log`, `web-*.log`).

## 10. Xử lý sự cố

| Triệu chứng | Nguyên nhân & cách xử lý |
|---|---|
| `pm2 status` → `errored`, log có `Cannot find module '.prisma/client'` | Thiếu bước generate. Chạy `pnpm --filter @app/api prisma:generate` rồi `pm2 restart ketoan-api`. |
| API log `P1001: Can't reach database server` | Service `postgresql-x64-16` chưa chạy, hoặc `DATABASE_URL` sai. `Get-Service postgresql*`; kiểm tra `apps\api\.env`. |
| API log `P1000: Authentication failed` | Sai mật khẩu role `ketoan`. Chạy lại `setup-database.ps1 -Force -DbPassword ...`. |
| Web mở được nhưng mọi API trả 502 | `ketoan-api` chết. `pm2 logs ketoan-api`. |
| Mở trang trắng, console lỗi 404 file `.js` | Chưa build web. `pnpm build`, kiểm tra `apps\web\dist\index.html` tồn tại. |
| Refresh trang con (`/cash/vouchers/1`) ra 404 | Đang dùng IIS phục vụ trực tiếp `dist` mà thiếu SPA fallback. Dùng `web-server.cjs` (đã có fallback) hoặc thêm URL Rewrite trỏ về `index.html`. |
| `pnpm install` lỗi `EPERM`/`code 1` khi tạo symlink | Bật Developer Mode hoặc chạy PowerShell as Administrator (pnpm dùng symlink cho workspace). |
| `pnpm build` bị kill giữa chừng | Hết RAM. Xem hardware-requirements §5 — build ở máy khác rồi copy `dist`. |
| Import Excel trả `413 Payload Too Large` | Vượt giới hạn 5 MB JSON. Chia file nhỏ hơn. |
| Đăng nhập xong bị đá ra ngay | JWT secret vừa đổi (`-Force`). Xóa localStorage trình duyệt, đăng nhập lại. |
| Số liệu ngày chứng từ lệch 1 ngày | Múi giờ máy chủ không phải UTC+7. Xem §1. |
