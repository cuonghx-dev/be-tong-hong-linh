import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { CashVoucherType } from '@prisma/client'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CashService } from './cash.service'
import { CashVoucherFilterDto } from './dto/cash-voucher-filter.dto'
import { CreateCashVoucherDto } from './dto/create-cash-voucher.dto'
import { SetCashPostedDto } from './dto/set-cash-posted.dto'
import { UpdateCashVoucherDto } from './dto/update-cash-voucher.dto'
import { Action, Domain } from '../../common/decorators/domain.decorator'

@ApiTags('cash')
@Domain('cash')
@Controller('cash/vouchers')
export class CashController {
  constructor(private readonly cash: CashService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách phiếu thu/chi (lọc + phân trang)' })
  list(@Query() filter: CashVoucherFilterDto) {
    return this.cash.list(filter)
  }

  // Đặt TRƯỚC @Get(':id') để route ':id' không nuốt mất 'next-no'.
  @Get('next-no')
  @ApiOperation({ summary: 'Xem trước số phiếu kế tiếp (chỉ hiển thị, không giữ chỗ)' })
  nextNo(
    @Query('type', new ParseEnumPipe(CashVoucherType)) type: CashVoucherType,
    @Query('voucherDate') voucherDate?: string,
  ) {
    return this.cash.previewNextVoucherNo(type, voucherDate)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 phiếu' })
  findOne(@Param('id') id: string) {
    return this.cash.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Tạo phiếu thu/chi' })
  create(@Body() dto: CreateCashVoucherDto) {
    return this.cash.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu phiếu thu/chi từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.cash.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa phiếu' })
  update(@Param('id') id: string, @Body() dto: UpdateCashVoucherDto) {
    return this.cash.update(id, dto)
  }

  @Action('post')

  @Patch(':id/posted')
  @ApiOperation({ summary: 'Ghi sổ / bỏ ghi phiếu' })
  setPosted(@Param('id') id: string, @Body() dto: SetCashPostedDto) {
    return this.cash.setPosted(id, dto.posted)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phiếu' })
  remove(@Param('id') id: string) {
    return this.cash.remove(id)
  }
}
