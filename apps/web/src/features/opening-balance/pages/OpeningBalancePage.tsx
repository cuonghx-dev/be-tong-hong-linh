import { Link } from 'react-router-dom'
import { OPENING_BALANCE_ITEMS } from '../opening-balance-items'
import { OPENING_BALANCE_ICONS } from '../opening-balance-icons'

// Trang hub Nhập số dư ban đầu: lưới thẻ các nghiệp vụ (theo MISA).
export function OpeningBalancePage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-slate-800">Nhập số dư ban đầu</h1>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OPENING_BALANCE_ITEMS.map((item) => {
          const Icon = OPENING_BALANCE_ICONS[item.slug]
          return (
            <Link
              key={item.slug}
              to={item.to ?? `/opening-balance/${item.slug}`}
              className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-white px-4 py-10 text-center transition-shadow hover:shadow-md"
            >
              {Icon && <Icon size={56} />}
              <span className="text-base font-semibold text-slate-800">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
