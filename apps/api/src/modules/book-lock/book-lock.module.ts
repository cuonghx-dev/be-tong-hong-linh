import { Module } from '@nestjs/common'
import { BookLockController } from './book-lock.controller'
import { BookLockService } from './book-lock.service'

@Module({
  controllers: [BookLockController],
  providers: [BookLockService],
  exports: [BookLockService],
})
export class BookLockModule {}
