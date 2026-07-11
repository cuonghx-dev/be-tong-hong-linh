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
import { CreateIncomeExpenseItemDto } from './dto/create-income-expense-item.dto'
import { IncomeExpenseItemFilterDto } from './dto/income-expense-item-filter.dto'
import { UpdateIncomeExpenseItemDto } from './dto/update-income-expense-item.dto'
import { IncomeExpenseItemService } from './income-expense-item.service'

@ApiTags('catalog')
@Controller('catalog/income-expense-items')
export class IncomeExpenseItemController {
  constructor(private readonly incomeExpenseItems: IncomeExpenseItemService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách mục thu/chi (lọc + phân trang)' })
  list(@Query() filter: IncomeExpenseItemFilterDto) {
    return this.incomeExpenseItems.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 mục thu/chi' })
  findOne(@Param('id') id: string) {
    return this.incomeExpenseItems.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm mục thu/chi' })
  create(@Body() dto: CreateIncomeExpenseItemDto) {
    return this.incomeExpenseItems.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu mục thu/chi từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.incomeExpenseItems.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa mục thu/chi' })
  update(@Param('id') id: string, @Body() dto: UpdateIncomeExpenseItemDto) {
    return this.incomeExpenseItems.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mục thu/chi' })
  remove(@Param('id') id: string) {
    return this.incomeExpenseItems.remove(id)
  }
}
