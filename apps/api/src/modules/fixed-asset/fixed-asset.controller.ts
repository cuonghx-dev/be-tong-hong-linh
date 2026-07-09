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
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto'
import { FixedAssetFilterDto } from './dto/fixed-asset-filter.dto'
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto'
import { FixedAssetService } from './fixed-asset.service'

@ApiTags('fixed-asset')
@Controller('fixed-assets')
export class FixedAssetController {
  constructor(private readonly asset: FixedAssetService) {}

  @Get()
  @ApiOperation({ summary: 'Sổ tài sản cố định (lọc + phân trang + tổng cộng)' })
  list(@Query() filter: FixedAssetFilterDto) {
    return this.asset.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 thẻ tài sản' })
  findOne(@Param('id') id: string) {
    return this.asset.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Ghi tăng tài sản (tạo thẻ)' })
  create(@Body() dto: CreateFixedAssetDto) {
    return this.asset.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu Sổ tài sản cố định từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.asset.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa thẻ tài sản' })
  update(@Param('id') id: string, @Body() dto: UpdateFixedAssetDto) {
    return this.asset.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thẻ tài sản' })
  remove(@Param('id') id: string) {
    return this.asset.remove(id)
  }
}
