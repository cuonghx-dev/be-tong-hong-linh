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

/** User seed từ initial-database betonghonglinh — mật khẩu chung admin123. */
export const TEST_USERS = {
  admin: 'admin@ketoan.vn',
  ketoan: 'ketoan@ketoan.vn',
  thuquy: 'thuquy@ketoan.vn',
  viewer: 'viewer@ketoan.vn',
} as const

export type TestRole = keyof typeof TEST_USERS

export const TEST_PASSWORD = 'admin123'

export async function loginAs(app: INestApplication, role: TestRole): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: TEST_USERS[role], password: TEST_PASSWORD })
    .expect(200)
  return res.body.accessToken as string
}

export function prismaOf(app: INestApplication): PrismaService {
  return app.get(PrismaService)
}
