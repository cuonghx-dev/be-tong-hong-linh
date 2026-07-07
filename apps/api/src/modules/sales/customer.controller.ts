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
import { CustomerService } from './customer.service'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { CustomerFilterDto } from './dto/customer-filter.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'

@ApiTags('sales')
@Controller('sales/customers')
export class CustomerController {
  constructor(private readonly customers: CustomerService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khách hàng (lọc + phân trang)' })
  list(@Query() filter: CustomerFilterDto) {
    return this.customers.list(filter)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 khách hàng' })
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm khách hàng' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto)
  }

  @Post('import')
  @ApiOperation({ summary: 'Nhập khẩu khách hàng từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.customers.importXlsx(file.buffer)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa khách hàng' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa khách hàng' })
  remove(@Param('id') id: string) {
    return this.customers.remove(id)
  }
}
