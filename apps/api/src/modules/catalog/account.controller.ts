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
import { AccountService } from './account.service'
import { AccountFilterDto } from './dto/account-filter.dto'
import { CreateAccountDto } from './dto/create-account.dto'
import { UpdateAccountDto } from './dto/update-account.dto'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('catalog')
@Domain('catalog')
@Controller('catalog/accounts')
export class AccountController {
  constructor(private readonly accounts: AccountService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách hệ thống tài khoản (lọc + phân trang)' })
  list(@Query() filter: AccountFilterDto) {
    return this.accounts.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 tài khoản' })
  findOne(@Param('id') id: string) {
    return this.accounts.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm tài khoản' })
  create(@Body() dto: CreateAccountDto) {
    return this.accounts.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu hệ thống tài khoản từ file Excel (.xlsx)' })
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
  @ApiOperation({ summary: 'Sửa tài khoản' })
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accounts.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài khoản' })
  remove(@Param('id') id: string) {
    return this.accounts.remove(id)
  }
}
