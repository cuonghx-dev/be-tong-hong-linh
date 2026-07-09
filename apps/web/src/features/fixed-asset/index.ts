// Public API — phân hệ Tài sản cố định (06-tscd).
export { FixedAssetPage } from './pages/FixedAssetPage'
export { AssetIncreasePage } from './pages/AssetIncreasePage'
export { FixedAssetDisposalPage } from './pages/FixedAssetDisposalPage'
export { FixedAssetTable } from './components/FixedAssetTable'
export { AssetIncreaseTable } from './components/AssetIncreaseTable'
export { DisposalTable } from './components/DisposalTable'
export { useFixedAssets, useFixedAsset } from './api/useFixedAssets'
export {
  useCreateFixedAsset,
  useUpdateFixedAsset,
  useDeleteFixedAsset,
  useImportFixedAssets,
} from './api/useFixedAssetMutations'
export { useDisposals, useDisposal } from './api/useDisposals'
export {
  useCreateDisposal,
  useUpdateDisposal,
  useDeleteDisposal,
  useImportDisposals,
} from './api/useDisposalMutations'
