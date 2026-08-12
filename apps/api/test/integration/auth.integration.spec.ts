import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp, loginAs, TEST_PASSWORD, TEST_USERS } from '../helpers/test-app'

describe('Auth (integration)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/login', () => {
    it('đăng nhập đúng trả về cặp token + thông tin user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_USERS.admin, password: TEST_PASSWORD })
        .expect(200)

      expect(res.body.accessToken).toEqual(expect.any(String))
      expect(res.body.refreshToken).toEqual(expect.any(String))
    })

    it('sai mật khẩu → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_USERS.admin, password: 'sai-mat-khau' })
        .expect(401)
    })

    it('email không tồn tại → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'khongtontai@ketoan.vn', password: TEST_PASSWORD })
        .expect(401)
    })
  })

  describe('GET /api/auth/me', () => {
    it('có token → trả đúng email và role', async () => {
      const token = await loginAs(app, 'ketoan')
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.email).toBe(TEST_USERS.ketoan)
      expect(res.body.role).toBe('KETOAN')
    })

    it('không token → 401', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401)
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('refreshToken hợp lệ → cấp cặp token mới', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: TEST_USERS.admin, password: TEST_PASSWORD })
        .expect(200)

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: login.body.refreshToken })
        .expect(200)

      expect(res.body.accessToken).toEqual(expect.any(String))
      expect(res.body.refreshToken).toEqual(expect.any(String))
    })

    it('token rác → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'token-rac' })
        .expect(401)
    })
  })

  it('route nghiệp vụ không token → 401 (guard toàn cục)', async () => {
    await request(app.getHttpServer()).get('/api/cash/vouchers').expect(401)
  })
})
