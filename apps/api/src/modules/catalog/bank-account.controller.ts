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
import { BankAccountService } from './bank-account.service'
import { BankAccountFilterDto } from './dto/bank-account-filter.dto'
import { CreateBankAccountDto } from './dto/create-bank-account.dto'
import { UpdateBankAccountDto } from './dto/update-bank-account.dto'

@ApiTags('catalog')
@Controller('catalog/bank-accounts')
export class BankAccountController {
  constructor(private readonly accounts: BankAccountService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tài khoản ngân hàng (lọc + phân trang)' })
  list(@Query() filter: BankAccountFilterDto) {
    return this.accounts.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 tài khoản ngân hàng' })
  findOne(@Param('id') id: string) {
    return this.accounts.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm tài khoản ngân hàng' })
  create(@Body() dto: CreateBankAccountDto) {
    return this.accounts.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu tài khoản ngân hàng từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.accounts.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa tài khoản ngân hàng' })
  update(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.accounts.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài khoản ngân hàng' })
  remove(@Param('id') id: string) {
    return this.accounts.remove(id)
  }
}
