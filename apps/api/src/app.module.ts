import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { BankModule } from './modules/bank/bank.module'
import { BookLockModule } from './modules/book-lock/book-lock.module'
import { CashModule } from './modules/cash/cash.module'
import { CatalogModule } from './modules/catalog/catalog.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { GeneralModule } from './modules/general/general.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { OpeningBalanceModule } from './modules/opening-balance/opening-balance.module'
import { PurchaseModule } from './modules/purchase/purchase.module'
import { ReportModule } from './modules/report/report.module'
import { SalesModule } from './modules/sales/sales.module'
import { UsersModule } from './modules/users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        // pino-pretty chạy trong worker thread — bật ở test sẽ giữ jest không thoát.
        transport:
          process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    DatabaseModule,
    AuthModule,
    BookLockModule,
    CashModule,
    BankModule,
    PurchaseModule,
    SalesModule,
    InventoryModule,
    GeneralModule,
    CatalogModule,
    DashboardModule,
    OpeningBalanceModule,
    ReportModule,
    UsersModule,
  ],
  providers: [
    // Guard toàn cục: mọi endpoint yêu cầu đăng nhập (trừ @Public), rồi mới xét quyền @Domain.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
