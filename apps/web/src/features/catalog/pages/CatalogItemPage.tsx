import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SupplierTable } from '@/features/purchase'
import { CustomerTable } from '@/features/sales'
import { ChevronLeftIcon } from '@/shared/ui/icons'
import { TabPlaceholder } from '@/shared/ui/tab-placeholder'
import { CostObjectTable } from '../components/CostObjectTable'
import { EmployeeTable } from '../components/EmployeeTable'
import { ExpenseItemTable } from '../components/ExpenseItemTable'
import { PartnerGroupTable } from '../components/PartnerGroupTable'
import { findCatalogItem } from '../catalog-groups'

// Danh mục đã có sẵn màn hình ở phân hệ khác → render lại tại đây (cùng data).
const CATALOG_VIEWS: Record<string, () => ReactNode> = {
  'khach-hang': () => <CustomerTable />,
  'nha-cung-cap': () => <SupplierTable />,
  'nhan-vien': () => <EmployeeTable />,
  'nhom-khach-hang-nha-cung-cap': () => <PartnerGroupTable />,
  'doi-tuong-tap-hop-chi-phi': () => <CostObjectTable />,
  'khoan-muc-chi-phi': () => <ExpenseItemTable />,
}

// Trang chi tiết 1 danh mục — render màn hình có sẵn, chưa build thì placeholder.
export function CatalogItemPage() {
  const { slug } = useParams<{ slug: string }>()
  const item = slug ? findCatalogItem(slug) : undefined
  const view = slug ? CATALOG_VIEWS[slug] : undefined

  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <Link
          to="/catalog"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeftIcon size={16} />
          Danh mục
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-bold text-slate-800">
        {item?.label ?? 'Không tìm thấy danh mục'}
      </h1>
      <div className="mt-4">
        {view ? view() : <TabPlaceholder label={item?.label ?? 'Danh mục'} />}
      </div>
    </div>
  )
}
