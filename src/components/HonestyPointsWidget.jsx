import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyStanding, getMyPointsHistory, POINTS_REASON_LABEL } from '../lib/api/leaderboard'

/**
 * Drop this into Dashboard.jsx:
 *   import HonestyPointsWidget from '../components/HonestyPointsWidget'
 *   ...
 *   <HonestyPointsWidget />
 */
export default function HonestyPointsWidget() {
  const [standing, setStanding] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMyStanding('semester'), getMyPointsHistory(5)])
      .then(([s, h]) => {
        setStanding(s)
        setHistory(h)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse h-40" />
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#0b2240]">Honesty Points</h3>
        <Link to="/leaderboard" className="text-xs text-[#008080] font-medium hover:underline">
          View leaderboard →
        </Link>
      </div>

      <div className="flex items-end gap-2 mb-4">
        <span className="text-3xl font-bold text-[#008080]">{standing?.points ?? 0}</span>
        <span className="text-sm text-gray-400 mb-1">
          {standing?.rank ? `rank #${standing.rank} this semester` : 'this semester'}
        </span>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-gray-400">
          Surrender a found item at the security desk to start earning points.
        </p>
      ) : (
        <ul className="space-y-2">
          {history.map((h) => (
            <li key={h.id} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="text-[#0b2240] truncate">
                  {POINTS_REASON_LABEL[h.reason] ?? h.reason}
                </p>
                {h.item?.title && <p className="text-xs text-gray-400 truncate">{h.item.title}</p>}
              </div>
              <span className={`font-semibold shrink-0 ml-3 ${h.points > 0 ? 'text-[#008080]' : 'text-red-500'}`}>
                {h.points > 0 ? '+' : ''}{h.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}