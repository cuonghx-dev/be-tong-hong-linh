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
import { CreateGoodsIssueDto } from './dto/create-goods-issue.dto'
import { GoodsIssueFilterDto } from './dto/goods-issue-filter.dto'
import { SetGoodsIssuePostedDto } from './dto/set-goods-issue-posted.dto'
import { UpdateGoodsIssueDto } from './dto/update-goods-issue.dto'
import { GoodsIssueService } from './goods-issue.service'
import { Action, Domain } from '../../common/decorators/domain.decorator'

@ApiTags('inventory')
@Domain('inventory')
@Controller('inventory/issues')
export class GoodsIssueController {
  constructor(private readonly issue: GoodsIssueService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách phiếu xuất kho (lọc + phân trang)' })
  list(@Query() filter: GoodsIssueFilterDto) {
    return this.issue.list(filter)
  }

  // Đặt TRƯỚC @Get(':id') để route ':id' không nuốt mất 'next-no'.
  @Get('next-no')
  @ApiOperation({ summary: 'Xem trước số phiếu xuất kế tiếp (chỉ hiển thị, không giữ chỗ)' })
  nextNo(@Query('voucherDate') voucherDate?: string) {
    return this.issue.previewNextVoucherNo(voucherDate)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 phiếu xuất kho' })
  findOne(@Param('id') id: string) {
    return this.issue.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Tạo phiếu xuất kho' })
  create(@Body() dto: CreateGoodsIssueDto) {
    return this.issue.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu phiếu xuất kho từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.issue.importXlsx(file.buffer)
  }

  @Action('post')

  @Patch(':id/posted')
  @ApiOperation({ summary: 'Ghi sổ / bỏ ghi phiếu xuất kho (đổi cờ posted)' })
  setPosted(@Param('id') id: string, @Body() dto: SetGoodsIssuePostedDto) {
    return this.issue.setPosted(id, dto.posted)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa phiếu xuất kho' })
  update(@Param('id') id: string, @Body() dto: UpdateGoodsIssueDto) {
    return this.issue.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phiếu xuất kho' })
  remove(@Param('id') id: string) {
    return this.issue.remove(id)
  }
}
