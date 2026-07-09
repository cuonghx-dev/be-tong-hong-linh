import { Module } from '@nestjs/common'
import { DisposalController } from './disposal.controller'
import { DisposalService } from './disposal.service'
import { FixedAssetController } from './fixed-asset.controller'
import { FixedAssetService } from './fixed-asset.service'

@Module({
  // DisposalController đăng ký trước FixedAssetController để route cụ thể
  // /fixed-assets/disposals thắng route bắt tham số /fixed-assets/:id.
  controllers: [DisposalController, FixedAssetController],
  providers: [FixedAssetService, DisposalService],
  exports: [FixedAssetService, DisposalService],
})
export class FixedAssetModule {}
