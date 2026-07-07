// Public API — phân hệ Mua hàng.
export { PurchasePage } from './pages/PurchasePage'
// HHDV là master dùng chung (mua + bán) — export để phân hệ Bán hàng tái dùng.
export { ItemTable } from './components/ItemTable'
export { usePurchaseVouchers, usePurchaseVoucher } from './api/usePurchaseVouchers'
export {
  useCreatePurchaseVoucher,
  useUpdatePurchaseVoucher,
  useDeletePurchaseVoucher,
} from './api/usePurchaseVoucherMutations'
export { useSuppliers, useSupplier } from './api/useSuppliers'
export {
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from './api/useSupplierMutations'
export { useItems, useItem } from './api/useItems'
export { useCreateItem, useUpdateItem, useDeleteItem } from './api/useItemMutations'
