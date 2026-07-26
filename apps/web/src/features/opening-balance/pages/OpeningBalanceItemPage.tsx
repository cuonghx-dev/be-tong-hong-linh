import { Link, useParams } from 'react-router-dom'
import { ChevronLeftIcon } from '@/shared/ui/icons'
import { TabPlaceholder } from '@/shared/ui/tab-placeholder'
import { findOpeningBalanceItem } from '../opening-balance-items'

// Trang chi tiết 1 nghiệp vụ nhập số dư ban đầu — chưa build, hiển thị placeholder.
export function OpeningBalanceItemPage() {
  const { slug } = useParams<{ slug: string }>()
  const item = slug ? findOpeningBalanceItem(slug) : undefined

  return (
    <div className="px-6 py-5">
      <div className="flex items-center gap-2">
        <Link
          to="/opening-balance"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeftIcon size={16} />
          Số dư ban đầu
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-bold text-slate-800">
        {item?.label ?? 'Không tìm thấy nghiệp vụ'}
      </h1>
      <div className="mt-4">
        <TabPlaceholder label={item?.label ?? 'Số dư ban đầu'} />
      </div>
    </div>
  )
}
