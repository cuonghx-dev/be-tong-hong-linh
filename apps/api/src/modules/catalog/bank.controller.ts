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
import { BankService } from './bank.service'
import { BankFilterDto } from './dto/bank-filter.dto'
import { CreateBankDto } from './dto/create-bank.dto'
import { UpdateBankDto } from './dto/update-bank.dto'

@ApiTags('catalog')
@Controller('catalog/banks')
export class BankController {
  constructor(private readonly banks: BankService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách ngân hàng (lọc + phân trang)' })
  list(@Query() filter: BankFilterDto) {
    return this.banks.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 ngân hàng' })
  findOne(@Param('id') id: string) {
    return this.banks.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm ngân hàng' })
  create(@Body() dto: CreateBankDto) {
    return this.banks.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu ngân hàng từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.banks.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa ngân hàng' })
  update(@Param('id') id: string, @Body() dto: UpdateBankDto) {
    return this.banks.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa ngân hàng' })
  remove(@Param('id') id: string) {
    return this.banks.remove(id)
  }
}
