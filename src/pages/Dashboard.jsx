import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listMyItems } from '../lib/api/items'
import HonestyPointsWidget from '../components/HonestyPointsWidget'

const STATUS_STYLE = {
  active:   { label: 'Active',   className: 'bg-[#e6f2f2] text-[#008080]' },
  matched:  { label: 'Matched',  className: 'bg-amber-50 text-amber-700' },
  claimed:  { label: 'Claimed',  className: 'bg-amber-50 text-amber-700' },
  returned: { label: 'Returned', className: 'bg-gray-100 text-gray-500' },
  expired:  { label: 'Expired',  className: 'bg-gray-100 text-gray-400' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-500' },
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listMyItems()
      .then((rows) => setItems(rows.slice(0, 5)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0b2240] mb-1">Hi, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mb-6">
          Report something lost or found, and keep an eye on your reports below.
        </p>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Link
            to="/report-lost"
            className="bg-[#0b2240] text-white rounded-2xl p-5 hover:bg-[#0e2c52] transition flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">Report a Lost Item</p>
              <p className="text-sm text-white/60 mt-0.5">Lost something on campus?</p>
            </div>
            <span className="text-2xl">＋</span>
          </Link>
          <Link
            to="/report-found"
            className="bg-[#008080] text-white rounded-2xl p-5 hover:bg-[#006666] transition flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">Report a Found Item</p>
              <p className="text-sm text-white/70 mt-0.5">Found something? Log it here</p>
            </div>
            <span className="text-2xl">＋</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My reports */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#0b2240]">My Recent Reports</h2>
              <Link to="/items/lost" className="text-xs text-[#008080] font-medium hover:underline">
                Browse all items →
              </Link>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-3">You haven't reported anything yet.</p>
                <Link to="/report-lost" className="text-[#008080] font-medium text-sm hover:underline">
                  Report your first item →
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((item) => {
                  const status = STATUS_STYLE[item.status] ?? STATUS_STYLE.active
                  return (
                    <li key={item.id}>
                      <Link
                        to={`/item/${item.id}`}
                        className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition"
                      >
                        <div className="h-11 w-11 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                          {item.primaryPhoto ? (
                            <img src={item.primaryPhoto} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#0b2240] text-sm truncate">{item.title}</p>
                          <p className="text-xs text-gray-400">
                            {item.type === 'lost' ? 'Lost' : 'Found'} · {new Date(item.occurred_on).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${status.className}`}>
                          {status.label}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
              <Link to="/my-claims" className="text-[#008080] font-medium hover:underline">
                My Claims →
              </Link>
              <Link to="/leaderboard" className="text-[#008080] font-medium hover:underline">
                Leaderboard →
              </Link>
            </div>
          </div>

          {/* Honesty points sidebar */}
          <div>
            <HonestyPointsWidget />
          </div>
        </div>
      </div>
    </div>
  )
}