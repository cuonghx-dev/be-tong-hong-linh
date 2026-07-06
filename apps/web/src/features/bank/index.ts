// Public API — phân hệ Tiền gửi.
export { BankPage } from './pages/BankPage'
export { useBankVouchers, useBankVoucher } from './api/useBankVouchers'
export {
  useCreateBankVoucher,
  useUpdateBankVoucher,
  useDeleteBankVoucher,
} from './api/useBankVoucherMutations'
