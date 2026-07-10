import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateExpenseItemDto } from './dto/create-expense-item.dto'
import { ExpenseItemFilterDto } from './dto/expense-item-filter.dto'
import { UpdateExpenseItemDto } from './dto/update-expense-item.dto'
import { ExpenseItemService } from './expense-item.service'

@ApiTags('catalog')
@Controller('catalog/expense-items')
export class ExpenseItemController {
  constructor(private readonly items: ExpenseItemService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khoản mục chi phí (lọc + phân trang)' })
  list(@Query() filter: ExpenseItemFilterDto) {
    return this.items.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 khoản mục chi phí' })
  findOne(@Param('id') id: string) {
    return this.items.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm khoản mục chi phí' })
  create(@Body() dto: CreateExpenseItemDto) {
    return this.items.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu khoản mục chi phí từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.items.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa khoản mục chi phí' })
  update(@Param('id') id: string, @Body() dto: UpdateExpenseItemDto) {
    return this.items.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa khoản mục chi phí' })
  remove(@Param('id') id: string) {
    return this.items.remove(id)
  }
}
