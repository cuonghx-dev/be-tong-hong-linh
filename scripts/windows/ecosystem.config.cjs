/**
 * Cấu hình pm2 cho Windows Server.
 *
 *   pm2 startOrReload scripts/windows/ecosystem.config.cjs --update-env
 *
 * - ketoan-api: NestJS đã build (apps/api/dist/main.js), đọc apps/api/.env qua @nestjs/config.
 * - ketoan-web: static server + proxy /api (scripts/windows/web-server.cjs).
 *
 * API chỉ bind loopback thì không dùng được (Nest listen mọi interface), nên chặn cổng 3000
 * từ bên ngoài bằng Windows Firewall — chỉ mở 8080. Xem docs/deploy-windows-server.md §6.
 */
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..', '..')
const logDir = path.join(repoRoot, 'logs')

const API_PORT = process.env.API_PORT || 3000
const WEB_PORT = process.env.WEB_PORT || 8080

// Yêu cầu pm2 5.x (xem install-prereqs.ps1). Với pm2 7.0.3, tiến trình con không
// resolve được dependency của api: "Cannot find module '@nestjs/common'" ném từ
// require-in-the-middle trong ProcessContainerFork, dù chạy `node dist/main.js`
// trực tiếp thì bình thường. Đặt NODE_PATH hay cài lại deps kiểu hoisted đều không
// chữa được — chỉ hạ pm2 mới hết.
//
// Service pm2 cũng phải chạy bằng account người dùng, KHÔNG phải LocalSystem: dưới
// LocalSystem lỗi MODULE_NOT_FOUND quay lại y như trên.

module.exports = {
  apps: [
    {
      name: 'ketoan-api',
      script: path.join(repoRoot, 'apps', 'api', 'dist', 'main.js'),
      cwd: path.join(repoRoot, 'apps', 'api'),
      exec_mode: 'fork', // Nest + Prisma pool: 1 process; scale bằng instances chỉ khi đã tách session/queue
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        API_PORT,
      },
      out_file: path.join(logDir, 'api-out.log'),
      error_file: path.join(logDir, 'api-err.log'),
      time: true,
    },
    {
      name: 'ketoan-web',
      script: path.join(__dirname, 'web-server.cjs'),
      cwd: repoRoot,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        WEB_PORT,
        WEB_HOST: '0.0.0.0',
        API_HOST: '127.0.0.1',
        API_PORT,
      },
      out_file: path.join(logDir, 'web-out.log'),
      error_file: path.join(logDir, 'web-err.log'),
      time: true,
    },
  ],
}
