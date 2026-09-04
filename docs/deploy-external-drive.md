# Triển khai trên ổ cứng rời (Windows)

Đặt **mã nguồn + `node_modules` + data PostgreSQL + log** trên một ổ cứng rời cắm cố định vào máy chủ (giả định chữ ổ `F:`), trong khi Node/pnpm/pm2/PostgreSQL vẫn cài bình thường trên `C:`.

Dùng khi ổ `C:` chật hoặc muốn tách dữ liệu kế toán ra thiết bị riêng để mang đi cất/khoá két.

**Không** phải hướng dẫn portable ("cắm ổ vào máy nào cũng chạy") — mô hình đó cần bản portable của Node và PostgreSQL, không nằm trong phạm vi tài liệu này.

Mọi mục không nhắc tới ở đây (HTTPS, nâng cấp, vận hành hằng ngày, xử lý sự cố chung) dùng nguyên [deploy-windows-server.md](deploy-windows-server.md), chỉ thay `C:\apps\ke-toan-SME` → `F:\apps\ke-toan-SME`.

Mọi lệnh PowerShell chạy trong cửa sổ **Run as Administrator**.

---

## 1. Chuẩn bị ổ rời (làm trước, đừng bỏ)

### 1.1 Bắt buộc NTFS

exFAT/FAT32 không có ACL, không có hardlink và symlink:

- PostgreSQL không đặt được data directory (`initdb`/`pg_ctl` fail ở bước kiểm tra quyền, `icacls` không áp dụng được);
- pnpm hỏng cả hai đường: symlink workspace lỗi `EPERM`, store mất hardlink nên copy toàn bộ.

```powershell
Get-Volume F | Select-Object DriveLetter, FileSystemType, SizeRemaining   # FileSystemType phai la NTFS
fsutil behavior query SymlinkEvaluation                                    # L2L, L2R phai enabled
```

> **Cảnh báo:** `Format-Volume` xoá sạch phân vùng, không phục hồi được. Sao lưu dữ liệu đang có trên ổ và xác nhận đúng chữ ổ đĩa (`Get-Volume`) trước khi chạy.

```powershell
Format-Volume -DriveLetter F -FileSystem NTFS -NewFileSystemLabel 'KETOAN'
```

### 1.2 Ghim chữ ổ đĩa

Windows lưu ánh xạ chữ ổ ↔ volume trong registry `HKLM\SYSTEM\MountedDevices`. Ánh xạ này có dính, nhưng vẫn mất khi: rút ổ ra rồi cắm USB/thẻ nhớ khác vào (thiết bị mới chiếm mất chữ, ổ kế toán cắm lại nhận chữ trống kế tiếp), đổi cổng USB trên vài controller, hoặc thêm phân vùng/ổ mạng trùng chữ. Chỉ chữ **gán tay** mới là entry cố định.

Chữ ổ đổi thì gãy đồng loạt, không cái nào tự chữa:

| Thành phần | Đường dẫn dính chữ ổ | Hậu quả |
|---|---|---|
| Service PostgreSQL | `binPath` có `-D "F:\pgdata"` (§3) | Service không start, log `could not open directory`. API kèm theo lỗi `P1001`. |
| pm2 | `pm2 save` ghi cứng đường dẫn `ecosystem.config.cjs` và script vào dump (§6) | Sau reboot pm2 resurrect fail, `ketoan-api`/`ketoan-web` không lên. |
| Scheduled Task backup | `-File F:\apps\...\backup-db.ps1` (§7) | Backup fail âm thầm hằng đêm — chỉ lộ ra lúc cần phục hồi. |
| `apps\api\.env` | Không dính (trỏ `localhost`) | Không ảnh hưởng. |

Gán chữ:

1. `Win+R` → `diskmgmt.msc`.
2. Panel dưới, tìm đúng đĩa của ổ rời — đối chiếu dung lượng và nhãn `KETOAN` đặt ở §1.1. Nhìn nhầm là gán chữ cho ổ khác.
3. Chuột phải **ô phân vùng** (ô có nhãn, không phải ô `Disk 2` bên trái) → *Change Drive Letter and Paths…*
4. *Change…* → *Assign the following drive letter* → chọn `F` → OK → Yes.

Nên chọn chữ ở cuối bảng chữ cái (`P:`, `S:`, `Z:`) thay vì `F:`: Windows cấp phát tự động cho USB mới theo thứ tự từ `D:` lên, chữ cao gần như không bị tranh. Đổi chữ thì phải sửa đồng loạt `binPath` service PostgreSQL, `pnpm config set store-dir`, đường dẫn đã `pm2 save`, Scheduled Task backup và exclusion Defender.

Kiểm tra:

```powershell
Get-Volume F | Select-Object DriveLetter, FileSystemLabel, FileSystemType
Get-Partition -DriveLetter F | Select-Object DiskNumber, PartitionNumber, Guid
```

Rồi rút ổ, cắm một USB khác vào, cắm ổ lại: `Get-Volume F` vẫn phải ra đúng nhãn `KETOAN`.

#### Cách chắc hơn: mount vào thư mục, bỏ chữ ổ đĩa

NTFS cho mount volume vào một **thư mục rỗng** thay vì chữ cái. Đường dẫn khi đó nằm trên `C:`, không có gì để nhảy:

```powershell
New-Item -ItemType Directory C:\ketoan-data -Force
# diskmgmt.msc -> Change Drive Letter and Paths -> Add
#   -> Mount in the following empty NTFS folder -> C:\ketoan-data
```

Rồi thay `F:\` bằng `C:\ketoan-data\` ở mọi mục sau (`C:\ketoan-data\pgdata`, `C:\ketoan-data\apps\ke-toan-SME`, …). Vẫn là ổ rời vật lý, chỉ khác cách trỏ tới.

Đánh đổi: mở Explorer không nhận ra dữ liệu đang nằm trên ổ rời, và **khi ổ chưa cắm thì `C:\ketoan-data` trông như thư mục rỗng bình thường** — chạy tay `initdb` hay `deploy.ps1` lúc đó sẽ ghi thẳng vào ổ `C:`. Cắm cố định một máy thì gán chữ như trên là đủ và dễ vận hành hơn.

### 1.3 Tắt ngủ ổ đĩa và USB selective suspend

Ổ tự ngủ giữa giờ làm làm Postgres đứt I/O. Đặt cả nhánh AC lẫn DC (máy laptop rút điện sẽ rơi về DC):

```powershell
powercfg /change disk-timeout-ac 0
powercfg /change disk-timeout-dc 0
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0

$UsbSub = '2a737441-1930-4402-8d77-b2bebba308a3'   # USB settings
$UsbSel = '48e6b7a6-50f5-4782-a5d4-53bb8f07e226'   # USB selective suspend
powercfg /setacvalueindex SCHEME_CURRENT $UsbSub $UsbSel 0
powercfg /setdcvalueindex SCHEME_CURRENT $UsbSub $UsbSel 0
powercfg /setactive SCHEME_CURRENT
```

### 1.4 Giữ chính sách "Quick removal"

Windows mặc định đặt ổ rời ở *Quick removal* — tắt write cache của thiết bị, mọi lệnh ghi xuống thẳng ổ. **Giữ nguyên.**

*Better performance* bật write cache: Windows báo "đã ghi xong" trong khi dữ liệu còn nằm trong RAM. Mất điện hoặc rút nhầm ổ ⇒ WAL và data file của PostgreSQL ghi dở, sai thứ tự ⇒ hỏng data directory, phải phục hồi từ backup.

Kiểm tra và đặt lại:

1. `Win+X` → *Device Manager* (hoặc `Win+R` → `devmgmt.msc`).
2. Mở nhánh **Disk drives**, chọn đúng ổ rời theo tên model (vd `Samsung T7 USB Device`). Nhánh *Universal Serial Bus controllers* không có tab này — đừng nhầm.
3. Chuột phải → *Properties* → tab **Policies**.
4. Chọn **Quick removal (default)**. Nếu đang ở *Better performance*, bỏ luôn cả checkbox *Enable write caching on the device* bên dưới.
5. OK. Windows có thể yêu cầu rút–cắm lại ổ để áp dụng.

Không có tab *Policies* = ổ đang gắn qua cầu USB báo mình là ổ cố định (một số enclosure/NVMe adapter). Khi đó xử lý như ổ trong máy: giữ nguyên mặc định của Windows, và bù lại bằng UPS + backup (§7) — vì write cache của ổ cố định luôn bật.

Kiểm tra nhanh bằng PowerShell (key chỉ xuất hiện khi đã từng đổi tay, `1` = đang bật cache, phải sửa lại):

```powershell
Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Enum\USBSTOR' -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.PSChildName -eq 'Classpnp' } |
  ForEach-Object { Get-ItemProperty $_.PSPath -Name UserWriteCacheSetting -ErrorAction SilentlyContinue }
```

Tab *Policies* trong Device Manager mới là nguồn chính xác — registry chỉ để soát nhanh.

Ba điểm dễ hiểu nhầm:

- Chính sách gắn theo **từng thiết bị**, đôi khi theo từng cổng USB. Đổi cổng hoặc thay ổ là phải kiểm tra lại.
- *Quick removal* chỉ tắt cache **phía Windows**. Cache DRAM trong bản thân ổ SSD/enclosure vẫn còn và vẫn có thể nói dối lúc mất điện. Cho nên vẫn cần UPS cho máy chủ và backup hằng ngày ra ổ khác.
- *Quick removal* **không** có nghĩa rút ổ lúc nào cũng được. Tiến trình đang mở file (PostgreSQL) thì rút vẫn hỏng. Luôn theo trình tự ở §8.

Đừng đụng vào `fsync`, `synchronous_commit`, `full_page_writes` trong `postgresql.conf` — mặc định đã đúng, tắt đi để chạy nhanh hơn trên ổ rời là cách nhanh nhất để mất dữ liệu kế toán.

### 1.5 BitLocker

Ổ rời bật BitLocker To Go mà không auto-unlock thì sau reboot ổ vẫn khoá, service PostgreSQL fail dù đã đặt delayed start. Hoặc tắt BitLocker cho ổ này, hoặc:

```powershell
Enable-BitLockerAutoUnlock -MountPoint F:
```

### 1.6 Phần cứng

Nên dùng SSD qua USB 3.0 trở lên. HDD 5400rpm qua USB 2.0 làm PostgreSQL chậm thấy rõ và `pnpm install` kéo dài hàng chục phút.

## 2. Cài phần mềm nền (trên C:, như bình thường)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\windows\install-prereqs.ps1
```

Node 20 LTS, pnpm 9, **pm2 5.4.3** (bắt buộc 5.x — xem deploy-windows-server §5), PostgreSQL 16. Ghi lại mật khẩu superuser `postgres`.

Trỏ pnpm store về cùng volume với mã nguồn, nếu không pnpm không hardlink được và phải copy toàn bộ (chậm nhiều lần, tốn thêm vài GB):

```powershell
pnpm config set store-dir F:\pnpm-store
```

Loại trừ antivirus cho ổ dữ liệu — Defender quét real-time trên USB làm chậm rõ cả install lẫn I/O của Postgres:

```powershell
Add-MpPreference -ExclusionPath 'F:\pgdata','F:\apps\ke-toan-SME','F:\pnpm-store'
```

## 3. Chuyển data directory PostgreSQL sang F:

Bỏ qua mục này nếu chỉ muốn mã nguồn nằm trên ổ rời, còn DB để nguyên `C:`.

```powershell
Stop-Service postgresql-x64-16
robocopy "C:\Program Files\PostgreSQL\16\data" "F:\pgdata" /E /COPYALL /DCOPY:DAT /R:1 /W:1

# service cua EDB installer chay bang local user "postgres"
icacls F:\pgdata /grant "postgres:(OI)(CI)F" /T

sc.exe config postgresql-x64-16 binPath= "\"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe\" runservice -N \"postgresql-x64-16\" -D \"F:\pgdata\" -w"
sc.exe config postgresql-x64-16 start= delayed-auto

Start-Service postgresql-x64-16
```

`delayed-auto` để Windows mount xong ổ USB rồi mới khởi động PostgreSQL. Để `auto`, service chạy trước khi ổ sẵn sàng và log ra `could not open directory "F:\pgdata"`.

Kiểm tra:

```powershell
psql -U postgres -c "SHOW data_directory;"    # F:/pgdata
```

Chạy ổn định rồi mới đổi tên thư mục data cũ thành `data.bak`; giữ 1–2 tuần trước khi xoá.

## 4. Đưa mã nguồn lên ổ rời + tạo database

```powershell
git clone <repo-url> F:\apps\ke-toan-SME
cd F:\apps\ke-toan-SME
.\scripts\windows\setup-database.ps1 -DbPassword 'MatKhauManh#2026'
```

Sinh `apps\api\.env` và `apps\web\.env.production`. Không phải sửa gì cho ổ rời: `scripts/windows/ecosystem.config.cjs` tính `repoRoot` theo vị trí file nên tự bám `F:`.

## 5. Build + chạy

```powershell
$env:INITIAL_DB_ADMIN_PASSWORD = 'MatKhauAdmin#2026'
.\scripts\windows\deploy.ps1 -Seed        # lan dau; cac lan sau chi ".\scripts\windows\deploy.ps1"
pm2 status                                 # ketoan-api + ketoan-web = online
```

Mở `http://<ip-may-chu>:8080`. **Đổi mật khẩu admin ngay sau lần đăng nhập đầu tiên.**

`pnpm install` lỗi `EPERM` khi tạo symlink → bật Developer Mode hoặc chạy PowerShell as Administrator.

## 6. pm2 tự chạy sau khi reboot

Làm theo deploy-windows-server §5, hai khác biệt:

- **`PM2_HOME` giữ trên `C:\ProgramData\pm2\home`** (mặc định của pm2-installer). Đừng đặt lên ổ rời: service pm2 khởi động trước khi ổ mount xong sẽ ghi hỏng metadata.
- Đặt service pm2 khởi động trễ cho khớp thứ tự mount ổ.

```powershell
Stop-Service pm2.exe -Force
sc.exe config pm2.exe obj= ".\<ten-user>" password= "<mat-khau>"   # KHONG de LocalSystem
sc.exe config pm2.exe start= delayed-auto
Start-Service pm2.exe

$env:PM2_HOME = [Environment]::GetEnvironmentVariable('PM2_HOME','Machine')
pm2 start F:\apps\ke-toan-SME\scripts\windows\ecosystem.config.cjs --update-env
pm2 save
```

`$env:PM2_HOME` phải đặt lại ở **mọi phiên** PowerShell; thiếu nó pm2 dựng daemon riêng theo phiên và daemon đó chết khi đóng RDP/SSH.

Reboot thử một lần, rồi kiểm tra `Get-Service pm2.exe`, `Get-Service postgresql-x64-16`, `pm2 status`.

## 7. Tường lửa và backup

Firewall giữ nguyên deploy-windows-server §6 (mở 8080 cho LAN, chặn 3000 và 5432).

Backup **không để chung ổ rời với data** — hỏng ổ là mất cả hai:

```powershell
schtasks /Create /SC DAILY /ST 01:00 /RU SYSTEM /TN "KetoanSME-Backup" `
  /TR "powershell -ExecutionPolicy Bypass -File F:\apps\ke-toan-SME\scripts\windows\backup-db.ps1 -BackupDir C:\backup\ketoan-sme"
```

`backup-db.ps1` cần mật khẩu DB từ `%PGPASSWORD%` hoặc `%APPDATA%\postgresql\pgpass.conf` vì Task Scheduler chạy không tương tác.

## 8. Rút ổ rời — đọc kỹ

> **Không rút ổ khi ứng dụng đang chạy.** PostgreSQL đang ghi mà mất ổ đột ngột sẽ hỏng data directory, nguy cơ mất toàn bộ dữ liệu kế toán.

Trình tự đúng khi cần rút:

```powershell
pm2 stop all
Stop-Service postgresql-x64-16
```

Sau đó dùng *Safely Remove Hardware*. Cắm lại:

```powershell
Start-Service postgresql-x64-16
pm2 start all
```

## 9. Xử lý sự cố riêng của mô hình ổ rời

| Triệu chứng | Nguyên nhân & cách xử lý |
|---|---|
| Sau reboot PostgreSQL `errored`, log `could not open directory "F:\pgdata"` | Service chạy trước khi Windows mount ổ. Đặt `sc.exe config postgresql-x64-16 start= delayed-auto` (§3). Nếu ổ có BitLocker: bật auto-unlock (§1.5). |
| Chữ ổ nhảy thành `G:` | Ghim lại `F` trong `diskmgmt.msc` (§1.2). Nếu đã lỡ chạy với chữ ổ khác, sửa lại `binPath` của service PostgreSQL. |
| `pnpm install` lỗi `EPERM` khi tạo symlink | Ổ không phải NTFS (§1.1), hoặc thiếu quyền — bật Developer Mode / chạy as Administrator. |
| `pnpm install` rất chậm, ổ đầy nhanh | pnpm store nằm khác volume nên không hardlink được. `pnpm config set store-dir F:\pnpm-store`, xoá `node_modules` rồi cài lại (§2). |
| `initdb`/`pg_ctl` báo permission denied trên `F:\pgdata` | Thiếu ACL cho user `postgres`. Chạy lại `icacls` ở §3. |
| App chậm bất thường, disk 100% | Ổ USB ngủ (§1.3), antivirus quét (§2), hoặc phần cứng là HDD/USB 2.0 (§1.6). Cân nhắc để `pgdata` lại trên SSD trong máy, chỉ để mã nguồn + backup trên ổ rời. |
| Mất điện xong DB không mở được | Write cache đang bật. Kiểm tra chính sách *Quick removal* (§1.4), phục hồi từ backup theo deploy-windows-server §7. |
