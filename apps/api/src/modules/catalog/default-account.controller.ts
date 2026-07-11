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
import { DefaultAccountService } from './default-account.service'
import { CreateDefaultAccountDto } from './dto/create-default-account.dto'
import { DefaultAccountFilterDto } from './dto/default-account-filter.dto'
import { UpdateDefaultAccountDto } from './dto/update-default-account.dto'

@ApiTags('catalog')
@Controller('catalog/default-accounts')
export class DefaultAccountController {
  constructor(private readonly defaultAccounts: DefaultAccountService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tài khoản ngầm định (lọc + phân trang)' })
  list(@Query() filter: DefaultAccountFilterDto) {
    return this.defaultAccounts.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 tài khoản ngầm định' })
  findOne(@Param('id') id: string) {
    return this.defaultAccounts.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm tài khoản ngầm định' })
  create(@Body() dto: CreateDefaultAccountDto) {
    return this.defaultAccounts.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu tài khoản ngầm định từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.defaultAccounts.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa tài khoản ngầm định' })
  update(@Param('id') id: string, @Body() dto: UpdateDefaultAccountDto) {
    return this.defaultAccounts.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài khoản ngầm định' })
  remove(@Param('id') id: string) {
    return this.defaultAccounts.remove(id)
  }
}
