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
import { CreateProductionOrderDto } from './dto/create-production-order.dto'
import { ProductionOrderFilterDto } from './dto/production-order-filter.dto'
import { UpdateProductionOrderDto } from './dto/update-production-order.dto'
import { ProductionOrderService } from './production-order.service'

@ApiTags('inventory')
@Controller('inventory/production-orders')
export class ProductionOrderController {
  constructor(private readonly order: ProductionOrderService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách lệnh sản xuất (lọc + phân trang)' })
  list(@Query() filter: ProductionOrderFilterDto) {
    return this.order.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 lệnh sản xuất' })
  findOne(@Param('id') id: string) {
    return this.order.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Tạo lệnh sản xuất' })
  create(@Body() dto: CreateProductionOrderDto) {
    return this.order.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu lệnh sản xuất từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.order.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa lệnh sản xuất' })
  update(@Param('id') id: string, @Body() dto: UpdateProductionOrderDto) {
    return this.order.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa lệnh sản xuất' })
  remove(@Param('id') id: string) {
    return this.order.remove(id)
  }
}
