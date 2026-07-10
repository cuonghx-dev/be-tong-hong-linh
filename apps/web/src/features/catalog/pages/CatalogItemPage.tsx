import { Link, useParams } from 'react-router-dom'
import { ChevronLeftIcon } from '@/shared/ui/icons'
import { TabPlaceholder } from '@/shared/ui/tab-placeholder'
import { findCatalogItem } from '../catalog-groups'

// Trang chi tiết 1 danh mục — chưa build, hiển thị placeholder theo tên danh mục.
export function CatalogItemPage() {
  const { slug } = useParams<{ slug: string }>()
  const item = slug ? findCatalogItem(slug) : undefined

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
        <TabPlaceholder label={item?.label ?? 'Danh mục'} />
      </div>
    </div>
  )
}
