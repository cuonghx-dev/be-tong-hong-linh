import { execSync } from 'node:child_process'
import path from 'node:path'

const API_DIR = path.resolve(__dirname, '..')
const IT_DATABASE_URL =
  process.env.IT_DATABASE_URL ??
  'postgresql://ketoan:ketoan@localhost:5432/ketoan_sme_it?schema=public'

// Reset + seed 1 lần cho cả run (seed đọc xlsx nên chậm — không lặp per-spec).
// IT_REUSE_DB=1: giữ nguyên DB đã seed cho vòng lặp dev.
export default function globalSetup(): void {
  if (process.env.IT_REUSE_DB) return
  const env = { ...process.env, DATABASE_URL: IT_DATABASE_URL }
  const opts = { cwd: API_DIR, env, stdio: 'inherit' as const }
  execSync('pnpm exec prisma migrate reset --force --skip-seed --skip-generate', opts)
  execSync('pnpm exec prisma db seed', opts)
}
