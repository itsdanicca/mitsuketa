import { useEffect, useState, useCallback } from 'react'
import { getLeaderboard, getMyStanding } from '../lib/api/leaderboard'
import { useAuth } from '../context/AuthContext'

const PERIODS = [
  { key: 'month', label: 'This Month' },
  { key: 'semester', label: 'This Semester' },
  { key: 'all', label: 'All Time' },
]

const MEDAL = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('semester')
  const [rows, setRows] = useState([])
  const [mine, setMine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([getLeaderboard(period), getMyStanding(period)])
      .then(([leaderboard, standing]) => {
        setRows(leaderboard)
        setMine(standing)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => { load() }, [load])

  const iAmInTopList = mine && rows.some((r) => r.id === mine.id)

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0b2240] mb-1">Honesty Leaderboard</h1>
        <p className="text-sm text-gray-500 mb-6">
          Earned by surrendering found items at the security desk — 50 points each.
        </p>

        <div className="inline-flex bg-white rounded-lg p-1 shadow-sm mb-6">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                period === p.key ? 'bg-[#0b2240] text-white' : 'text-gray-500 hover:text-[#0b2240]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Your own standing — always visible, even if you're rank #400 */}
        {mine && (
          <div className="bg-[#0b2240] text-white rounded-2xl p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/60">Your standing</p>
              <p className="font-semibold">
                {mine.rank ? `Rank #${mine.rank}` : 'Not ranked yet — surrender an item to get started'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{mine.points}</p>
              <p className="text-xs text-white/60">points</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No one has earned points {period === 'all' ? 'yet' : 'this ' + period}.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className={`flex items-center gap-4 px-5 py-3 ${
                    row.id === user?.id ? 'bg-[#e6f2f2]' : ''
                  }`}
                >
                  <span className="w-8 text-center font-semibold text-[#0b2240]">
                    {MEDAL[row.rank - 1] ?? row.rank}
                  </span>
                  <div className="h-9 w-9 rounded-full bg-gray-100 overflow-hidden shrink-0">
                    {row.avatar_url ? (
                      <img src={row.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                        {row.full_name?.[0] ?? '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#0b2240] truncate">
                      {row.full_name}
                      {row.id === user?.id && <span className="text-xs text-[#008080] ml-2">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {row.items_surrendered} item{row.items_surrendered === 1 ? '' : 's'} surrendered
                    </p>
                  </div>
                  <span className="font-bold text-[#008080]">{row.points}</span>
                </li>
              ))}

              {mine && !iAmInTopList && (
                <li className="flex items-center gap-4 px-5 py-3 bg-[#e6f2f2] border-t-2 border-dashed border-gray-200">
                  <span className="w-8 text-center font-semibold text-[#0b2240]">
                    {mine.rank ?? '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#0b2240]">You</p>
                  </div>
                  <span className="font-bold text-[#008080]">{mine.points}</span>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}