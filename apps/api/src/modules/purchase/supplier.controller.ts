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
import { CreateSupplierDto } from './dto/create-supplier.dto'
import { SupplierFilterDto } from './dto/supplier-filter.dto'
import { UpdateSupplierDto } from './dto/update-supplier.dto'
import { SupplierService } from './supplier.service'

@ApiTags('purchase')
@Controller('purchase/suppliers')
export class SupplierController {
  constructor(private readonly suppliers: SupplierService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhà cung cấp (lọc + phân trang)' })
  list(@Query() filter: SupplierFilterDto) {
    return this.suppliers.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 nhà cung cấp' })
  findOne(@Param('id') id: string) {
    return this.suppliers.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm nhà cung cấp' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu nhà cung cấp từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.suppliers.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa nhà cung cấp' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhà cung cấp' })
  remove(@Param('id') id: string) {
    return this.suppliers.remove(id)
  }
}
