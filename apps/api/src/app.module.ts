import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { BankModule } from './modules/bank/bank.module'
import { CashModule } from './modules/cash/cash.module'
import { CatalogModule } from './modules/catalog/catalog.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { GeneralModule } from './modules/general/general.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { OpeningBalanceModule } from './modules/opening-balance/opening-balance.module'
import { PurchaseModule } from './modules/purchase/purchase.module'
import { SalesModule } from './modules/sales/sales.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    DatabaseModule,
    AuthModule,
    CashModule,
    BankModule,
    PurchaseModule,
    SalesModule,
    InventoryModule,
    GeneralModule,
    CatalogModule,
    DashboardModule,
    OpeningBalanceModule,
  ],
  providers: [
    // Guard toàn cục: mọi endpoint yêu cầu đăng nhập (trừ @Public), rồi mới xét @Roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
