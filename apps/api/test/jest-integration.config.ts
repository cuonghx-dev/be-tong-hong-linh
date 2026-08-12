import type { Config } from 'jest'

// Integration test: app Nest thật + Postgres thật (DB riêng ketoan_sme_it).
// maxWorkers 1 bắt buộc: DB dùng chung, số chứng từ MAX+1 và khóa sổ là state
// toàn cục — chạy song song sẽ race.
const config: Config = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/test/tsconfig.json' }],
  },
  // Map về src để test không phụ thuộc dist của packages/shared (có thể stale).
  moduleNameMapper: {
    '^@app/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@app/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  testTimeout: 30_000,
  maxWorkers: 1,
  // pino transport worker thread có thể giữ process sống sau khi test xong.
  forceExit: true,
}

export default config
