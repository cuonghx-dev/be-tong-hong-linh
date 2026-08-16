# Yêu cầu phần cứng & hệ thống

Áp dụng cho bản triển khai on-premise (máy chủ của doanh nghiệp) — Windows Server hoặc Linux.
Hướng dẫn cài đặt: [deploy-windows-server.md](deploy-windows-server.md).

Hệ thống gồm 3 tiến trình chạy cùng máy (mặc định):

| Tiến trình | Là gì | RAM thực dùng | Ghi chú |
|---|---|---|---|
| `ketoan-api` | NestJS + Prisma (Node 20) | 250–500 MB | 1 process (fork), tăng khi import Excel lớn |
| `ketoan-web` | Static server + proxy `/api` (Node core) | 40–80 MB | chỉ đọc file `dist`, gần như không tốn CPU |
| PostgreSQL 16 | CSDL | 512 MB – 2 GB | `shared_buffers` + cache, xem §4 |

> Redis có trong `docker-compose.yml` và `.env.example` nhưng **chưa module nào dùng** (`@nestjs/bullmq` chỉ là dependency, không có `BullModule` trong `src`). Không cần cài Redis khi triển khai — chỉ thêm khi bật hàng đợi.

---

## 1. Cấu hình theo quy mô

Số liệu tính cho 1 máy chủ chạy cả 3 tiến trình. "Người dùng đồng thời" = số kế toán viên thao tác cùng lúc, không phải số tài khoản.

| Quy mô | Người dùng đồng thời | Chứng từ/năm | CPU | RAM | Ổ đĩa |
|---|---|---|---|---|---|
| **Tối thiểu** (1 DN nhỏ, 1–3 kế toán) | ≤ 3 | ≤ 20.000 | 2 vCPU | 4 GB | 60 GB SSD |
| **Khuyến nghị** (mặc định chọn cái này) | 5–15 | ≤ 100.000 | 4 vCPU | 8 GB | 120 GB SSD |
| **Nhiều đơn vị / tải cao** | 20–50 | ≤ 500.000 | 8 vCPU | 16 GB | 250 GB SSD NVMe |

Ràng buộc cứng:

- **RAM tối thiểu tuyệt đối 4 GB.** Dưới mức đó, riêng bước `pnpm build` (`tsc` + `vite build` + `nest build`) đã OOM. Nếu máy chủ chỉ có 2 GB thì phải build ở máy khác rồi copy `dist` sang (xem §5).
- **SSD bắt buộc.** Báo cáo tổng hợp (sổ nhật ký chung hợp nhất 7 bảng `*VoucherLine`) là truy vấn nặng I/O; HDD 7200rpm làm thời gian mở báo cáo tăng nhiều lần.
- **Kiến trúc x64.** Prisma engine bản Windows chỉ có `windows` (x64); ARM Windows không chạy được.

## 2. Dung lượng ổ đĩa — chi tiết

| Thành phần | Dung lượng |
|---|---|
| Windows Server + PostgreSQL 16 | ~25 GB |
| Mã nguồn + `node_modules` (pnpm store) | ~1,5 GB |
| Bản build (`dist` của api/web/shared) | ~50 MB |
| Dữ liệu Postgres — năm đầu, 20.000 chứng từ | ~300 MB |
| Dữ liệu Postgres — 100.000 chứng từ/năm × 5 năm | ~6–8 GB |
| WAL + index bloat (chưa `VACUUM FULL`) | +30% dữ liệu |
| Backup `pg_dump -Fc` giữ 30 ngày | ~10–15× kích thước 1 bản dump |

Ước lượng nhanh: **1 chứng từ ≈ 3–6 KB** (header + trung bình 3 dòng `*VoucherLine` + index). 100.000 chứng từ ≈ 500 MB kể cả index.

Đặt thư mục backup ở **ổ đĩa vật lý khác** ổ chứa data Postgres (script mặc định `D:\backup\ketoan-sme`).

## 3. Phần mềm nền

| Thành phần | Phiên bản | Bắt buộc |
|---|---|---|
| Windows Server | 2019 / 2022 / 2025 (bản Desktop hoặc Core) | ✅ (hoặc Ubuntu 22.04+) |
| Node.js | 20 LTS trở lên (`engines: node >= 20`) | ✅ |
| pnpm | 9.7.0 (`packageManager` trong `package.json`) | ✅ |
| PostgreSQL | 16 (14+ chạy được, chưa kiểm thử) | ✅ |
| pm2 | mới nhất | ✅ (hoặc NSSM/Windows Service) |
| Git | mới nhất | ⬜ chỉ khi deploy bằng `git pull` |
| Redis | 7 | ⬜ chưa dùng |
| IIS / nginx | — | ⬜ chỉ khi cần HTTPS, xem §6 deploy doc |

## 4. Tinh chỉnh PostgreSQL theo RAM

`postgresql.conf` (mặc định của installer đặt rất thấp):

| Tham số | 4 GB RAM | 8 GB RAM | 16 GB RAM |
|---|---|---|---|
| `shared_buffers` | 1GB | 2GB | 4GB |
| `effective_cache_size` | 2GB | 4GB | 8GB |
| `work_mem` | 8MB | 16MB | 32MB |
| `maintenance_work_mem` | 128MB | 256MB | 512MB |
| `max_connections` | 50 | 100 | 200 |

`work_mem` áp cho **mỗi node sort/hash**, không phải mỗi kết nối — đặt quá cao với `max_connections` lớn sẽ hết RAM. Báo cáo tổng hợp dùng `UNION ALL` + sort nên đây là tham số ảnh hưởng rõ nhất.

Prisma mặc định mở pool = `num_cpus * 2 + 1` kết nối cho mỗi tiến trình API. Với 4 vCPU → 9 kết nối, thoải mái dưới `max_connections`.

## 5. Máy build vs. máy chạy

Build nặng hơn chạy nhiều:

| Việc | CPU | RAM đỉnh | Thời gian (4 vCPU) |
|---|---|---|---|
| `pnpm install` | I/O | ~500 MB | 2–5 phút |
| `pnpm build` | CPU (tsc + vite) | **~2 GB** | 2–4 phút |
| Chạy (`ketoan-api` + `ketoan-web`) | thấp | ~500 MB | — |

Máy chủ yếu (2 GB RAM): build ở máy dev/CI rồi rsync/copy 4 thư mục `packages/shared/dist`, `apps/api/dist`, `apps/web/dist`, `apps/api/node_modules/.prisma` sang máy chủ. Prisma engine phụ thuộc HĐH → **phải build trên cùng nền tảng** (build Windows cho máy chủ Windows), hoặc chạy `pnpm --filter @app/api prisma:generate` tại máy chủ sau khi copy.

## 6. Mạng & bảo mật

Mô hình triển khai: **máy chủ đặt trong LAN nội bộ, không public ra Internet.**

- Mở cổng vào: **8080** (web) và chỉ cho dải LAN. **Không** mở 3000 (API), 5432 (Postgres) — API đã được web-server proxy qua `127.0.0.1`.
- Máy chủ cần **IP tĩnh** (hoặc DHCP reservation) + bản ghi DNS nội bộ để người dùng gõ tên thay vì IP.
- Băng thông: bundle web ~1 MB gzip lần tải đầu, sau đó cache theo hash. Mỗi thao tác lưu chứng từ vài chục KB JSON. **LAN 100 Mbps dư sức cho 50 người dùng**; switch gigabit là thoải mái.
- Import Excel: payload JSON giới hạn 5 MB (`app.useBodyParser('json', { limit: '5mb' })` trong `apps/api/src/main.ts`). File `.xlsx` lớn hơn phải chia lô.
- HTTPS: **không bắt buộc** khi chạy thuần LAN. Cần khi có Wi-Fi khách/mạng không tin cậy hoặc mở truy cập từ xa — khi đó dùng VPN hoặc IIS + chứng chỉ nội bộ, xem deploy doc §6.

## 7. Ảo hóa / cloud

Chạy tốt trên VM (Hyper-V, VMware, Proxmox) và cloud VPS. Tương đương cấu hình khuyến nghị:

| Nhà cung cấp | Gói tương đương (4 vCPU / 8 GB) |
|---|---|
| Azure | B4ms |
| AWS EC2 | t3.large (2/8) → t3.xlarge (4/16) |
| Google Cloud | e2-standard-4 |
| VPS trong nước | 4 vCPU / 8 GB / 120 GB SSD |

Không dùng ổ "burst credit" cạn kiệt (AWS gp2 nhỏ) cho volume chứa data Postgres — IOPS tụt làm báo cáo treo.
