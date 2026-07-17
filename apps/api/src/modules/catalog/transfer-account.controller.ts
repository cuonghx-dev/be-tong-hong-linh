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
import { CreateTransferAccountDto } from './dto/create-transfer-account.dto'
import { TransferAccountFilterDto } from './dto/transfer-account-filter.dto'
import { UpdateTransferAccountDto } from './dto/update-transfer-account.dto'
import { TransferAccountService } from './transfer-account.service'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('catalog')
@Domain('catalog')
@Controller('catalog/transfer-accounts')
export class TransferAccountController {
  constructor(private readonly transferAccounts: TransferAccountService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tài khoản kết chuyển (lọc + phân trang)' })
  list(@Query() filter: TransferAccountFilterDto) {
    return this.transferAccounts.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 tài khoản kết chuyển' })
  findOne(@Param('id') id: string) {
    return this.transferAccounts.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm tài khoản kết chuyển' })
  create(@Body() dto: CreateTransferAccountDto) {
    return this.transferAccounts.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu tài khoản kết chuyển từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.transferAccounts.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa tài khoản kết chuyển' })
  update(@Param('id') id: string, @Body() dto: UpdateTransferAccountDto) {
    return this.transferAccounts.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài khoản kết chuyển' })
  remove(@Param('id') id: string) {
    return this.transferAccounts.remove(id)
  }
}
