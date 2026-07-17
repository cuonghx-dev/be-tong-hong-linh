import { Body, Controller, Delete, Get, Put } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { BookLockService } from './book-lock.service'
import { SetBookLockDto } from './dto/set-book-lock.dto'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('book-lock')
@Domain('bookLock')
@Controller('book-lock')
export class BookLockController {
  constructor(private readonly bookLock: BookLockService) {}

  @Get()
  @ApiOperation({ summary: 'Trạng thái khóa sổ kỳ kế toán' })
  get() {
    return this.bookLock.get()
  }

  @Put()
  @ApiOperation({ summary: 'Khóa sổ kỳ kế toán đến ngày' })
  set(@Body() dto: SetBookLockDto) {
    return this.bookLock.set(dto)
  }

  @Delete()
  @ApiOperation({ summary: 'Bỏ khóa sổ kỳ kế toán' })
  clear() {
    return this.bookLock.clear()
  }
}
