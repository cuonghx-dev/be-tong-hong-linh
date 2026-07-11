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
import { CreateVoucherTypeDto } from './dto/create-voucher-type.dto'
import { UpdateVoucherTypeDto } from './dto/update-voucher-type.dto'
import { VoucherTypeFilterDto } from './dto/voucher-type-filter.dto'
import { VoucherTypeService } from './voucher-type.service'

@ApiTags('catalog')
@Controller('catalog/voucher-types')
export class VoucherTypeController {
  constructor(private readonly voucherTypes: VoucherTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách loại chứng từ (lọc + phân trang)' })
  list(@Query() filter: VoucherTypeFilterDto) {
    return this.voucherTypes.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 loại chứng từ' })
  findOne(@Param('id') id: string) {
    return this.voucherTypes.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm loại chứng từ' })
  create(@Body() dto: CreateVoucherTypeDto) {
    return this.voucherTypes.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu loại chứng từ từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.voucherTypes.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa loại chứng từ' })
  update(@Param('id') id: string, @Body() dto: UpdateVoucherTypeDto) {
    return this.voucherTypes.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa loại chứng từ' })
  remove(@Param('id') id: string) {
    return this.voucherTypes.remove(id)
  }
}
