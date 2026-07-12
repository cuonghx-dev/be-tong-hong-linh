import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { OpeningBalanceService } from './opening-balance.service'
import { SaveAccountBalancesDto } from './dto/save-account-balances.dto'
import { SaveBankAccountBalancesDto } from './dto/save-bank-account-balances.dto'
import { SavePartnerBalancesDto } from './dto/save-partner-balances.dto'

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

  @Get('partners')
  @ApiOperation({ summary: 'Số dư công nợ đầu kỳ chi tiết theo đối tượng của 1 TK' })
  @ApiQuery({ name: 'accountCode', description: 'Số TK công nợ (vd 131, 331)' })
  listPartners(@Query('accountCode') accountCode?: string) {
    if (!accountCode?.trim()) throw new BadRequestException('Thiếu số tài khoản')
    return this.openingBalance.listPartnerBalances(accountCode)
  }

  @Put('partners')
  @ApiOperation({ summary: 'Lưu số dư công nợ đầu kỳ của 1 TK (thay thế dữ liệu cũ)' })
  savePartners(@Body() dto: SavePartnerBalancesDto) {
    return this.openingBalance.savePartnerBalances(dto)
  }

  @Get('bank-accounts')
  @ApiOperation({ summary: 'Số dư tiền gửi đầu kỳ chi tiết theo tài khoản ngân hàng của 1 TK' })
  @ApiQuery({ name: 'accountCode', description: 'Số TK tiền gửi (vd 1121, 1122)' })
  listBankAccounts(@Query('accountCode') accountCode?: string) {
    if (!accountCode?.trim()) throw new BadRequestException('Thiếu số tài khoản')
    return this.openingBalance.listBankAccountBalances(accountCode)
  }

  @Put('bank-accounts')
  @ApiOperation({ summary: 'Lưu số dư tiền gửi đầu kỳ của 1 TK (thay thế dữ liệu cũ)' })
  saveBankAccounts(@Body() dto: SaveBankAccountBalancesDto) {
    return this.openingBalance.saveBankAccountBalances(dto)
  }
}
