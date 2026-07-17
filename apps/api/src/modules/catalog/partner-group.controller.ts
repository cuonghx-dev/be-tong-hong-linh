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
import { CreatePartnerGroupDto } from './dto/create-partner-group.dto'
import { PartnerGroupFilterDto } from './dto/partner-group-filter.dto'
import { UpdatePartnerGroupDto } from './dto/update-partner-group.dto'
import { PartnerGroupService } from './partner-group.service'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('catalog')
@Domain('catalog')
@Controller('catalog/partner-groups')
export class PartnerGroupController {
  constructor(private readonly groups: PartnerGroupService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhóm KH, NCC (lọc + phân trang)' })
  list(@Query() filter: PartnerGroupFilterDto) {
    return this.groups.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 nhóm KH, NCC' })
  findOne(@Param('id') id: string) {
    return this.groups.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm nhóm KH, NCC' })
  create(@Body() dto: CreatePartnerGroupDto) {
    return this.groups.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu nhóm KH, NCC từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.groups.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa nhóm KH, NCC' })
  update(@Param('id') id: string, @Body() dto: UpdatePartnerGroupDto) {
    return this.groups.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhóm KH, NCC' })
  remove(@Param('id') id: string) {
    return this.groups.remove(id)
  }
}
