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
import { DisposalService } from './disposal.service'
import { CreateDisposalDto } from './dto/create-disposal.dto'
import { DisposalFilterDto } from './dto/disposal-filter.dto'
import { UpdateDisposalDto } from './dto/update-disposal.dto'

@ApiTags('fixed-asset')
@Controller('fixed-assets/disposals')
export class DisposalController {
  constructor(private readonly disposal: DisposalService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách ghi giảm TSCD (lọc + phân trang)' })
  list(@Query() filter: DisposalFilterDto) {
    return this.disposal.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 chứng từ ghi giảm' })
  findOne(@Param('id') id: string) {
    return this.disposal.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Ghi giảm TSCD (nhượng bán, thanh lý…)' })
  create(@Body() dto: CreateDisposalDto) {
    return this.disposal.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu Danh sách ghi giảm từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.disposal.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa chứng từ ghi giảm' })
  update(@Param('id') id: string, @Body() dto: UpdateDisposalDto) {
    return this.disposal.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa chứng từ ghi giảm' })
  remove(@Param('id') id: string) {
    return this.disposal.remove(id)
  }
}
