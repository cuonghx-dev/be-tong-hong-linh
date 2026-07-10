import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { OpeningBalanceService } from './opening-balance.service'
import { SaveAccountBalancesDto } from './dto/save-account-balances.dto'

@ApiTags('opening-balance')
@Controller('opening-balance')
export class OpeningBalanceController {
  constructor(private readonly openingBalance: OpeningBalanceService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'Danh sách số dư tài khoản đầu kỳ' })
  listAccounts() {
    return this.openingBalance.listAccountBalances()
  }

  @Put('accounts')
  @ApiOperation({ summary: 'Lưu cả bảng số dư tài khoản (thay thế dữ liệu cũ)' })
  saveAccounts(@Body() dto: SaveAccountBalancesDto) {
    return this.openingBalance.saveAccountBalances(dto)
  }

  @Post('accounts/import')
  @ApiOperation({ summary: 'Nhập khẩu số dư tài khoản từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  importAccounts(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.openingBalance.importAccountBalancesXlsx(file.buffer)
  }
}
