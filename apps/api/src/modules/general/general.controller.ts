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
import { GeneralService } from './general.service'
import { GeneralVoucherFilterDto } from './dto/general-voucher-filter.dto'
import { CreateGeneralVoucherDto } from './dto/create-general-voucher.dto'
import { UpdateGeneralVoucherDto } from './dto/update-general-voucher.dto'
import { SetGeneralPostedDto } from './dto/set-general-posted.dto'

@ApiTags('general')
@Controller('general/vouchers')
export class GeneralController {
  constructor(private readonly general: GeneralService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chứng từ nghiệp vụ khác (lọc + phân trang)' })
  list(@Query() filter: GeneralVoucherFilterDto) {
    return this.general.list(filter)
  }

  // Đặt TRƯỚC @Get(':id') để route ':id' không nuốt mất 'next-no'.
  @Get('next-no')
  @ApiOperation({ summary: 'Xem trước số chứng từ kế tiếp (chỉ hiển thị, không giữ chỗ)' })
  nextNo(@Query('voucherDate') voucherDate?: string) {
    return this.general.previewNextVoucherNo(voucherDate)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 chứng từ' })
  findOne(@Param('id') id: string) {
    return this.general.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Tạo chứng từ nghiệp vụ khác' })
  create(@Body() dto: CreateGeneralVoucherDto) {
    return this.general.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu chứng từ nghiệp vụ khác từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.general.importXlsx(file.buffer)
  }

  @Patch(':id/posted')
  @ApiOperation({ summary: 'Ghi sổ / bỏ ghi chứng từ nghiệp vụ khác (đổi cờ posted)' })
  setPosted(@Param('id') id: string, @Body() dto: SetGeneralPostedDto) {
    return this.general.setPosted(id, dto.posted)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa chứng từ' })
  update(@Param('id') id: string, @Body() dto: UpdateGeneralVoucherDto) {
    return this.general.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa chứng từ' })
  remove(@Param('id') id: string) {
    return this.general.remove(id)
  }
}
