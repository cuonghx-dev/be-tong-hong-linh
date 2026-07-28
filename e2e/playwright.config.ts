import { defineConfig, devices } from '@playwright/test'
import path from 'path'

// DB test riêng trên cùng Postgres docker (KHÔNG đụng ketoan_sme dev).
export const TEST_DATABASE_URL =
  'postgresql://ketoan:ketoan@localhost:5432/ketoan_sme_test?schema=public'

const ROOT = path.resolve(__dirname, '..')

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  // Các spec dùng chung 1 DB (reset mỗi run) → chạy tuần tự, không tăng workers.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5111',
    locale: 'vi-VN',
    trace: 'retain-on-failure',
  },
  projects: [
    // Login 1 lần → lưu storageState cho mọi spec sau.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/admin.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      // Playwright boot webServer TRƯỚC globalSetup → reset + seed DB test phải nằm
      // ngay trong command này, trước khi Nest khởi động.
      // API trỏ DB test qua env override (process env thắng apps/api/.env).
      // reuseExistingServer: false — api dev đang chạy sẽ trỏ DB dev, phải fail rõ ràng.
      command: [
        'pnpm --filter @app/api exec prisma migrate reset --force --skip-seed --skip-generate',
        'pnpm --filter @app/api prisma:seed',
        'pnpm --filter @app/api exec nest start',
      ].join(' && '),
      url: 'http://localhost:5112/api/docs',
      // PW_REUSE=1: dev loop — dùng api đang chạy sẵn (tự lo trỏ DB test + seed), bỏ qua reset.
      reuseExistingServer: !!process.env.PW_REUSE,
      timeout: 240_000,
      cwd: ROOT,
      env: {
        DATABASE_URL: TEST_DATABASE_URL,
        API_PORT: '5112',
        NODE_ENV: 'test',
      },
    },
    {
      // Vite chỉ proxy /api → 5112, không dính DB → reuse được dev server đang chạy.
      command: 'pnpm --filter @app/web dev',
      url: 'http://localhost:5111',
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: ROOT,
    },
  ],
})
