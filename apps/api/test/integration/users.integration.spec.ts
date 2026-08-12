import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp, loginAs, prismaOf, TEST_USERS } from '../helpers/test-app'

const TAG = 'it-users'
const NEW_EMAIL = `${TAG}@ketoan.vn`

describe('Users (integration)', () => {
  let app: INestApplication
  let adminToken: string

  beforeAll(async () => {
    app = await createTestApp()
    adminToken = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    await prismaOf(app).user.deleteMany({ where: { email: NEW_EMAIL } })
    await app.close()
  })

  const http = () => request(app.getHttpServer())

  it('GET /api/users → danh sách chứa user seed', async () => {
    const res = await http().get('/api/users').set('Authorization', `Bearer ${adminToken}`).expect(200)
    const emails = res.body.map((u: { email: string }) => u.email)
    expect(emails).toEqual(expect.arrayContaining(Object.values(TEST_USERS)))
  })

  it('POST tạo user mới → login được bằng mật khẩu vừa đặt', async () => {
    const res = await http()
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: NEW_EMAIL, name: 'User IT', role: 'VIEWER', password: 'matkhau123' })
      .expect(201)
    expect(res.body.email).toBe(NEW_EMAIL)
    expect(res.body.role).toBe('VIEWER')

    await http().post('/api/auth/login').send({ email: NEW_EMAIL, password: 'matkhau123' }).expect(200)
  })

  it('email trùng → 409', async () => {
    const res = await http()
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: TEST_USERS.viewer, name: 'Trùng', role: 'VIEWER', password: 'matkhau123' })
      .expect(409)
    expect(res.body.message).toBe('Email đã được sử dụng')
  })

  describe('PATCH /api/users/:id', () => {
    it('id không phải UUID → 400', async () => {
      await http()
        .patch('/api/users/abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X' })
        .expect(400)
    })

    it('id lạ → 404', async () => {
      await http()
        .patch('/api/users/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X' })
        .expect(404)
    })

    it('tự khóa tài khoản mình → 400; tự đổi vai trò → 400', async () => {
      const admin = await prismaOf(app).user.findUniqueOrThrow({
        where: { email: TEST_USERS.admin },
      })

      const lock = await http()
        .patch(`/api/users/${admin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(400)
      expect(lock.body.message).toBe('Không thể tự khóa tài khoản của chính mình')

      const role = await http()
        .patch(`/api/users/${admin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'VIEWER' })
        .expect(400)
      expect(role.body.message).toBe('Không thể tự đổi vai trò của chính mình')
    })
  })
})
