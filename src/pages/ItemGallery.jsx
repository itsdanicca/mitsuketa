import { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { listItems, getCategories, getLocations } from '../lib/api/items'

/**
 * Route: /items/:type  where type is 'lost' | 'found'.
 * Two tabs, one component — the feed logic is identical, only the
 * `type` filter passed to listItems() changes.
 */
export default function ItemGallery() {
  const { type } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const activeType = type === 'found' ? 'found' : 'lost'

  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const search = params.get('q') || ''
  const categoryId = params.get('category') || ''
  const locationId = params.get('location') || ''
  const dateFrom = params.get('from') || ''
  const page = Number(params.get('page') || 0)
  const pageSize = 12

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
    getLocations().then(setLocations).catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    listItems({
      type: activeType,
      search,
      categoryId: categoryId || undefined,
      locationId: locationId || undefined,
      dateFrom: dateFrom || undefined,
      page,
      pageSize,
    })
      .then(({ items, total }) => {
        setItems(items)
        setTotal(total)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [activeType, search, categoryId, locationId, dateFrom, page])

  useEffect(() => { load() }, [load])

  function updateParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page') // any filter change resets pagination
    setParams(next)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="inline-flex bg-white rounded-lg p-1 shadow-sm">
            <TabLink to="/items/lost" active={activeType === 'lost'}>Lost Items</TabLink>
            <TabLink to="/items/found" active={activeType === 'found'}>Found Items</TabLink>
          </div>
          <Link
            to={activeType === 'lost' ? '/report-lost' : '/report-found'}
            className="bg-[#008080] text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-[#006666] transition"
          >
            {activeType === 'lost' ? '+ Report Lost Item' : '+ Report Found Item'}
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Search title or description…"
            className="input sm:col-span-2"
          />
          <select value={categoryId} onChange={(e) => updateParam('category', e.target.value)} className="input">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={locationId} onChange={(e) => updateParam('location', e.target.value)} className="input">
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <GridSkeleton />
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No {activeType} items match your filters yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onClick={() => navigate(`/item/${item.id}`)} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => updateParam('page', String(i))}
                className={`h-8 w-8 rounded-lg text-sm font-medium ${
                  i === page ? 'bg-[#008080] text-white' : 'bg-white text-gray-500 hover:bg-gray-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TabLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-md text-sm font-medium transition ${
        active ? 'bg-[#0b2240] text-white' : 'text-gray-500 hover:text-[#0b2240]'
      }`}
    >
      {children}
    </Link>
  )
}

function ItemCard({ item, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition group"
    >
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
        {item.primaryPhoto ? (
          <img
            src={item.primaryPhoto}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            No photo
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-[#008080] bg-[#e6f2f2] px-2 py-0.5 rounded-full">
            {item.category?.name ?? 'Uncategorized'}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(item.occurred_on).toLocaleDateString()}
          </span>
        </div>
        <h3 className="font-semibold text-[#0b2240] truncate">{item.title}</h3>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {item.location?.name ?? 'Location unknown'}
        </p>
      </div>
    </button>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
          <div className="aspect-[4/3] bg-gray-100" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
            <div className="h-3 w-1/2 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}