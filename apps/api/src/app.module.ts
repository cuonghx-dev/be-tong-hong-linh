import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { DatabaseModule } from './database/database.module'
import { CashModule } from './modules/cash/cash.module'

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
    // TODO: import feature module: AuthModule, CatalogModule, SalesModule, PurchaseModule,
    // BankModule, InventoryModule, ReportModule.
  ],
})
export class AppModule {}
