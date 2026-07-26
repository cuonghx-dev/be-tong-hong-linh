import { Link } from 'react-router-dom'
import { CATALOG_COLUMNS, type CatalogGroup } from '../catalog-groups'

function GroupBlock({ group }: { group: CatalogGroup }) {
  return (
    <section>
      <h2 className="text-base font-bold text-slate-800">{group.title}</h2>
      <ul className="mt-2 space-y-2">
        {group.items.map((item) => (
          <li key={item.slug}>
            <Link
              to={`/catalog/${item.slug}`}
              className="text-sm text-primary hover:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Trang hub Danh mục: các nhóm danh mục xếp 3 cột (theo MISA).
export function CatalogPage() {
  return (
    <div className="px-6 py-5">
      <h1 className="text-2xl font-bold text-slate-800">Danh mục</h1>
      <div className="mt-4 rounded-lg border border-border bg-white p-8">
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG_COLUMNS.map((column, i) => (
            <div key={i} className="space-y-8">
              {column.map((group) => (
                <GroupBlock key={group.title} group={group} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
