import { ValidationPipe, type INestApplication } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { PrismaService } from '../../src/database/prisma.service'

/** Bootstrap app giống hệt main.ts (prefix + body limit + ValidationPipe), logger tắt. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false })
  app.useBodyParser('json', { limit: '5mb' })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  await app.init()
  return app
}

/**
 * Seed betonghonglinh chỉ còn 1 user admin@ketoan.vn (mật khẩu admin123).
 * Các role còn lại do loginAs tự tạo qua POST /api/users khi cần.
 */
export const TEST_USERS = {
  admin: 'admin@ketoan.vn',
  ketoan: 'ketoan@ketoan.vn',
  thuquy: 'thuquy@ketoan.vn',
  viewer: 'viewer@ketoan.vn',
} as const

export type TestRole = keyof typeof TEST_USERS

export const TEST_PASSWORD = 'admin123'

const ROLE_OF: Record<Exclude<TestRole, 'admin'>, string> = {
  ketoan: 'KETOAN',
  thuquy: 'THUQUY',
  viewer: 'VIEWER',
}

export async function loginAs(app: INestApplication, role: TestRole): Promise<string> {
  const login = () =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: TEST_USERS[role], password: TEST_PASSWORD })

  const res = await login()
  if (res.status === 200) return res.body.accessToken as string

  // User role chưa tồn tại (seed chỉ có admin) → admin tạo rồi login lại.
  // Nếu đã tồn tại (409) — vd. test khác tạo với mật khẩu khác — reset về chuẩn.
  if (role === 'admin') throw new Error(`Login admin thất bại: ${res.status}`)
  const adminToken = await loginAs(app, 'admin')
  const created = await request(app.getHttpServer())
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: TEST_USERS[role],
      name: `IT ${role}`,
      role: ROLE_OF[role],
      password: TEST_PASSWORD,
    })
  if (created.status === 409) {
    const list = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    const existing = list.body.find((u: { email: string }) => u.email === TEST_USERS[role])
    await request(app.getHttpServer())
      .patch(`/api/users/${existing.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: ROLE_OF[role], isActive: true, password: TEST_PASSWORD })
      .expect(200)
  } else if (created.status !== 201) {
    throw new Error(`Tạo user ${role} thất bại: ${created.status}`)
  }
  const retry = await login().expect(200)
  return retry.body.accessToken as string
}

export function prismaOf(app: INestApplication): PrismaService {
  return app.get(PrismaService)
}
