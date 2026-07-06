import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { DatabaseModule } from './database/database.module'
import { BankModule } from './modules/bank/bank.module'
import { CashModule } from './modules/cash/cash.module'
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
    // TODO: import feature module: AuthModule, CatalogModule, InventoryModule, ReportModule.
  ],
})
export class AppModule {}
