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
import { CreateProductDto } from './dto/create-product.dto'
import { ProductFilterDto } from './dto/product-filter.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductService } from './product.service'

@ApiTags('catalog')
@Controller('catalog/products')
export class ProductController {
  constructor(private readonly products: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách hàng hóa, dịch vụ (lọc + phân trang)' })
  list(@Query() filter: ProductFilterDto) {
    return this.products.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 hàng hóa' })
  findOne(@Param('id') id: string) {
    return this.products.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm hàng hóa' })
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu hàng hóa từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.products.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa hàng hóa' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hàng hóa' })
  remove(@Param('id') id: string) {
    return this.products.remove(id)
  }
}
