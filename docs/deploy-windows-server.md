# Triển khai trên Windows Server

Hướng dẫn cài đặt Kế toán SME trên máy chủ Windows Server 2019/2022/2025, chạy **native** (không Docker Desktop — bản Server không có, và Docker trên Windows tốn RAM gấp đôi).

Mô hình triển khai: **máy chủ đặt trong LAN nội bộ của doanh nghiệp, không public ra Internet** — người dùng truy cập `http://<ip-máy-chủ>:8080` từ máy trạm cùng mạng. Xem §6 cho firewall và trường hợp cần HTTPS/truy cập từ xa.

Windows 10/11 cũng chạy được toàn bộ hướng dẫn này (đã kiểm chứng trên Windows 11 build 26200), chỉ thêm 2 lưu ý: máy client hay thiếu `winget` (tải installer trực tiếp, xem §2) và mặc định tự ngủ (tắt sleep, xem §5).

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

> **Bắt buộc dùng pm2 5.x.** pm2 7.0.3 làm `ketoan-api` chết ngay khi start với
> `Cannot find module '@nestjs/common'` (ném từ `require-in-the-middle` trong
> `ProcessContainerFork`), dù `node dist/main.js` chạy tay hoàn toàn bình thường.
> Đặt `NODE_PATH` vào store ẩn của pnpm và cài lại deps kiểu `node-linker=hoisted`
> đều **không** chữa được. `install-prereqs.ps1` đã pin `pm2@5.4.3`; `deploy.ps1`
> chặn luôn nếu phát hiện bản khác.

pm2 trên Windows không có `pm2 startup` như Linux. Dùng `pm2-installer`:

```powershell
# Tải https://github.com/jessety/pm2-installer → giải nén → trong thư mục đó:
npm run configure
npm run configure-policy
npm run setup
```

Nó tạo service `pm2.exe` với `PM2_HOME=C:\ProgramData\pm2\home`. Bước `setup` có thể
treo ở đoạn chờ service khởi động — cứ Ctrl+C rồi `Start-Service pm2.exe` bằng tay,
service vẫn dùng được.

### Service phải chạy bằng account người dùng, không phải LocalSystem

Mặc định pm2-installer chạy service dưới `LocalSystem`, và trong ngữ cảnh đó api lại
lỗi `MODULE_NOT_FOUND` y như với pm2 7. Đổi sang account đang cài đặt (thay tên/mật khẩu):

```powershell
Stop-Service pm2.exe -Force
sc.exe config pm2.exe obj= ".\<tên-user>" password= "<mật-khẩu>"
Start-Service pm2.exe
```

Nếu service báo lỗi 1069 (đăng nhập thất bại), cấp quyền **Log on as a service** cho
account đó: `secpol.msc → Local Policies → User Rights Assignment → Log on as a service`.

Sau đó nạp app vào daemon của service và lưu lại:

```powershell
$env:PM2_HOME = [Environment]::GetEnvironmentVariable('PM2_HOME','Machine')
pm2 start C:\apps\ke-toan-SME\scripts\windows\ecosystem.config.cjs --update-env
pm2 save
```

`$env:PM2_HOME` là bắt buộc ở mọi phiên: thiếu nó, `pm2` tự dựng daemon riêng theo
phiên đăng nhập, và **Windows kết liễu daemon đó khi phiên SSH/RDP đóng** — app tắt theo.

Kiểm tra: `Get-Service pm2.exe` phải `Running`, `pm2 status` thấy 2 app `online`.
Reboot thử một lần rồi `pm2 status` lại.

Cách thay thế — [NSSM](https://nssm.cc/): tạo service chạy trực tiếp
`node C:\apps\ke-toan-SME\apps\api\dist\main.js` và
`node C:\apps\ke-toan-SME\scripts\windows\web-server.cjs`, bỏ pm2 hoàn toàn. Cách này
tránh được cả hai vấn đề pm2 ở trên, đổi lại mất `pm2 logs`/`pm2 monit`.

### Máy chủ không được ngủ

Bản Windows client (10/11) mặc định sleep sau ít phút — app và SSH đứt theo:

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
```

## 6. Tường lửa (triển khai LAN nội bộ)

Mô hình triển khai chuẩn: **máy chủ chỉ phục vụ trong mạng LAN, không NAT/port-forward ra Internet.**
Cấu hình dưới đây chỉ mở cổng web cho đúng dải LAN, chặn API và Postgres từ mọi nơi khác.

```powershell
# Sửa dải LAN cho đúng thực tế (vd 192.168.1.0/24, 10.0.0.0/24)
$Lan = '192.168.1.0/24'

New-NetFirewallRule -DisplayName "Ketoan SME Web (LAN)" -Direction Inbound -Protocol TCP `
  -LocalPort 8080 -RemoteAddress $Lan -Action Allow

# API và DB chỉ dùng nội bộ máy chủ (web-server.cjs proxy qua 127.0.0.1)
New-NetFirewallRule -DisplayName "Block Ketoan API" -Direction Inbound -Protocol TCP `
  -LocalPort 3000 -RemoteAddress Any -Action Block
New-NetFirewallRule -DisplayName "Block Postgres"  -Direction Inbound -Protocol TCP `
  -LocalPort 5432 -RemoteAddress Any -Action Block
```

> Cảnh báo bảo mật: NestJS lắng nghe trên mọi interface (`app.listen(port)`), nên nếu không có rule chặn cổng 3000 thì bất kỳ máy nào trong LAN cũng gọi thẳng được API, bỏ qua lớp web. Giữ nguyên hai rule Block.

Kiểm tra từ một máy trạm trong LAN:

```powershell
Test-NetConnection <ip-may-chu> -Port 8080   # TcpTestSucceeded : True
Test-NetConnection <ip-may-chu> -Port 3000   # phai False
Test-NetConnection <ip-may-chu> -Port 5432   # phai False
```

Nên đặt **IP tĩnh** (hoặc DHCP reservation) cho máy chủ và một bản ghi DNS nội bộ
(vd `ketoan.local` trên DNS của domain controller) để người dùng gõ `http://ketoan.local:8080`
thay vì nhớ IP. Nếu không có DNS nội bộ, thêm dòng vào `C:\Windows\System32\drivers\etc\hosts` của từng máy trạm.

### HTTPS — khi nào cần

Chạy thuần LAN, không public: **HTTP cổng 8080 là đủ**, không cần chứng chỉ. Không xin được
Let's Encrypt cho tên miền nội bộ (không có DNS công khai), nên đừng dựng Caddy/ACME ở mô hình này.

Vẫn nên bật TLS nếu: LAN có Wi-Fi khách/không tin cậy, có yêu cầu tuân thủ nội bộ, hoặc
sau này mở truy cập từ xa. Khi đó chọn 1 trong 2 và **không mở cổng ra Internet**:

- **VPN** (khuyến nghị cho truy cập từ xa): giữ nguyên HTTP:8080, người dùng vào qua VPN của công ty. Không đổi gì trong ứng dụng.
- **IIS làm reverse proxy TLS** với chứng chỉ do AD Certificate Services (hoặc self-signed) cấp:
  1. Cài IIS role → [ARR](https://www.iis.net/downloads/microsoft/application-request-routing) + [URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite).
  2. Tạo site trống, bind 443 với chứng chỉ nội bộ.
  3. URL Rewrite → rule inbound: pattern `(.*)` → rewrite `http://localhost:8080/{R:1}`, type `Rewrite`.
  4. Đổi firewall: mở 443 cho `$Lan`, gỡ rule 8080.
  5. Push CA nội bộ vào Trusted Root của máy trạm bằng Group Policy, nếu không trình duyệt sẽ cảnh báo.

Dù chạy LAN, **vẫn giữ mật khẩu mạnh và JWT secret ngẫu nhiên** (script `setup-database.ps1` đã sinh sẵn) — phần lớn rủi ro rò rỉ dữ liệu kế toán đến từ máy trạm trong mạng, không phải từ Internet.

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
| `pm2 status` → `errored`, log có `Cannot find module '@nestjs/common'` | Sai bản pm2 (phải 5.x) hoặc service đang chạy dưới LocalSystem. Xem §5. Kiểm tra nhanh: `node apps\api\dist\main.js` chạy tay được mà pm2 thì không ⇒ đúng lỗi này. |
| `pm2 status` rỗng, mỗi lần đăng nhập lại thấy `Spawning PM2 daemon` | Thiếu `$env:PM2_HOME` nên pm2 nói chuyện với daemon riêng của phiên, daemon đó chết khi thoát SSH/RDP. Xem §5. |
| `pm2 status` → `errored`, log có `Cannot find module '.prisma/client'` | Thiếu bước generate. Chạy `pnpm --filter @app/api prisma:generate` rồi `pm2 restart ketoan-api`. |
| `prisma generate` lỗi `EPERM: operation not permitted, rename ... query_engine-windows.dll.node` | API đang chạy và giữ file engine. `pm2 stop ketoan-api` rồi generate lại (`deploy.ps1` đã tự làm). |
| Script `.ps1` báo `Missing closing '}'` / `The string is missing the terminator` dù code đúng | File `.ps1` bị lưu mất BOM: Windows PowerShell 5.1 đọc theo ANSI nên ký tự tiếng Việt/em dash hoá thành dấu nháy. Lưu lại UTF-8 **có BOM**. |
| Cài PostgreSQL qua SSH lỗi `Error writing file ... temp_check_comspec.bat` | Installer EDB cần session tương tác. Chạy qua Scheduled Task dưới SYSTEM, hoặc cài trực tiếp tại máy/RDP. |
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
