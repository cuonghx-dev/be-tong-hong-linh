import { Module } from '@nestjs/common'
import { BookLockModule } from '../book-lock/book-lock.module'
import { GeneralController } from './general.controller'
import { GeneralService } from './general.service'

@Module({
  imports: [BookLockModule],
  controllers: [GeneralController],
  providers: [GeneralService],
  exports: [GeneralService],
})
export class GeneralModule {}
