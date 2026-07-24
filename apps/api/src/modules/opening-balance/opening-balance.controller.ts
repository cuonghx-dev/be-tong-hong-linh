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
import { SaveFixedAssetBalancesDto } from './dto/save-fixed-asset-balances.dto'
import { SaveInventoryBalancesDto } from './dto/save-inventory-balances.dto'
import { SavePartnerBalancesDto } from './dto/save-partner-balances.dto'
import { Domain } from '../../common/decorators/domain.decorator'

@ApiTags('opening-balance')
@Domain('openingBalance')
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

  @Post('partners/import')
  @ApiOperation({ summary: 'Nhập khẩu số dư công nợ của 1 TK từ file Excel (.xlsx)' })
  @ApiQuery({ name: 'accountCode', description: 'Số TK công nợ (vd 131, 331)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  importPartners(
    @Query('accountCode') accountCode?: string,
    @UploadedFile() file?: { buffer: Buffer },
  ) {
    if (!accountCode?.trim()) throw new BadRequestException('Thiếu số tài khoản')
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.openingBalance.importPartnerBalancesXlsx(accountCode, file.buffer)
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

  @Post('bank-accounts/import')
  @ApiOperation({ summary: 'Nhập khẩu số dư tiền gửi của 1 TK từ file Excel (.xlsx)' })
  @ApiQuery({ name: 'accountCode', description: 'Số TK tiền gửi (vd 1121, 1122)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  importBankAccounts(
    @Query('accountCode') accountCode?: string,
    @UploadedFile() file?: { buffer: Buffer },
  ) {
    if (!accountCode?.trim()) throw new BadRequestException('Thiếu số tài khoản')
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.openingBalance.importBankAccountBalancesXlsx(accountCode, file.buffer)
  }

  @Get('fixed-assets')
  @ApiOperation({ summary: 'Danh sách tài sản cố định đầu kỳ' })
  listFixedAssets() {
    return this.openingBalance.listFixedAssetBalances()
  }

  @Put('fixed-assets')
  @ApiOperation({ summary: 'Lưu cả danh sách TSCĐ đầu kỳ (thay thế dữ liệu cũ)' })
  saveFixedAssets(@Body() dto: SaveFixedAssetBalancesDto) {
    return this.openingBalance.saveFixedAssetBalances(dto)
  }

  @Post('fixed-assets/import')
  @ApiOperation({ summary: 'Nhập khẩu TSCĐ đầu kỳ từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  importFixedAssets(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.openingBalance.importFixedAssetBalancesXlsx(file.buffer)
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Danh sách tồn kho đầu kỳ vật tư, hàng hóa, CCDC' })
  listInventory() {
    return this.openingBalance.listInventoryBalances()
  }

  @Put('inventory')
  @ApiOperation({ summary: 'Lưu cả bảng tồn kho đầu kỳ (thay thế dữ liệu cũ)' })
  saveInventory(@Body() dto: SaveInventoryBalancesDto) {
    return this.openingBalance.saveInventoryBalances(dto)
  }

  @Post('inventory/import')
  @ApiOperation({ summary: 'Nhập khẩu tồn kho đầu kỳ từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  importInventory(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Thiếu file Excel')
    return this.openingBalance.importInventoryBalancesXlsx(file.buffer)
  }
}
