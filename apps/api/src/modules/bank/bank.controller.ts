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
import { BankVoucherFilterDto } from './dto/bank-voucher-filter.dto'
import { CreateBankVoucherDto } from './dto/create-bank-voucher.dto'
import { UpdateBankVoucherDto } from './dto/update-bank-voucher.dto'

@ApiTags('bank')
@Controller('bank/vouchers')
export class BankController {
  constructor(private readonly bank: BankService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chứng từ thu/chi tiền gửi (lọc + phân trang)' })
  list(@Query() filter: BankVoucherFilterDto) {
    return this.bank.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 chứng từ' })
  findOne(@Param('id') id: string) {
    return this.bank.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Tạo chứng từ thu/chi tiền gửi' })
  create(@Body() dto: CreateBankVoucherDto) {
    return this.bank.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu chứng từ tiền gửi từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.bank.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa chứng từ' })
  update(@Param('id') id: string, @Body() dto: UpdateBankVoucherDto) {
    return this.bank.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa chứng từ' })
  remove(@Param('id') id: string) {
    return this.bank.remove(id)
  }
}
