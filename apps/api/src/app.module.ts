import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { DatabaseModule } from './database/database.module'
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
    CashModule,
    BankModule,
    PurchaseModule,
    SalesModule,
    InventoryModule,
    GeneralModule,
    CatalogModule,
    DashboardModule,
    OpeningBalanceModule,
    // TODO: import feature module: AuthModule, ReportModule.
  ],
})
export class AppModule {}
