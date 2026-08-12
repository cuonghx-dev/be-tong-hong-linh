// Chạy trong mỗi worker trước khi import bất kỳ module nào.
// Đặt ở đây (không phải global-setup) vì cả @nestjs/config lẫn dotenv của Prisma
// chỉ điền biến chưa có — process.env đặt trước sẽ thắng apps/api/.env.
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL =
  process.env.IT_DATABASE_URL ??
  'postgresql://ketoan:ketoan@localhost:5432/ketoan_sme_it?schema=public'
// JwtStrategy dùng getOrThrow — CI không có .env nên phải set tường minh.
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'it-access-secret'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'it-refresh-secret'
process.env.LOG_LEVEL = 'silent'
