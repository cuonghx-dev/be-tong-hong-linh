import type { FixedAssetDisposalFilter, FixedAssetFilter } from '@app/shared'

// Query keys phân hệ Tài sản cố định — Sổ tài sản + Ghi giảm (06-tscd).
export const fixedAssetKeys = {
  all: ['fixed-asset'] as const,
  list: (filter: FixedAssetFilter) => [...fixedAssetKeys.all, 'list', filter] as const,
  detail: (id: string) => [...fixedAssetKeys.all, 'detail', id] as const,
  disposals: (filter: FixedAssetDisposalFilter) =>
    [...fixedAssetKeys.all, 'disposals', filter] as const,
  disposal: (id: string) => [...fixedAssetKeys.all, 'disposal', id] as const,
}
