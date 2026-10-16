import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listMyClaims, withdrawClaim, getProofUrl } from '../lib/api/claims'

const STATUS_STYLE = {
  pending:   { label: 'Pending review', className: 'bg-amber-50 text-amber-700' },
  approved:  { label: 'Approved',       className: 'bg-[#e6f2f2] text-[#008080]' },
  rejected:  { label: 'Rejected',       className: 'bg-red-50 text-red-600' },
  collected: { label: 'Collected',      className: 'bg-gray-100 text-gray-600' },
}

export default function MyClaims() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(null)
  const [proofUrls, setProofUrls] = useState({})

  const load = useCallback(() => {
    setLoading(true)
    listMyClaims()
      .then(setClaims)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function loadOwnProof(claim) {
    if (!claim.proof_image_path || proofUrls[claim.id]) return
    const url = await getProofUrl(claim.proof_image_path).catch(() => null)
    if (url) setProofUrls((p) => ({ ...p, [claim.id]: url }))
  }

  async function handleWithdraw(claimId) {
    if (!window.confirm('Withdraw this claim? You can file it again later if needed.')) return
    setActing(claimId)
    try {
      await withdrawClaim(claimId)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0b2240] mb-1">My Claims</h1>
        <p className="text-sm text-gray-500 mb-6">Items you've claimed as yours, and their review status.</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-5 animate-pulse h-20" />
            ))}
          </div>
        ) : claims.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-gray-400 mb-3">You haven't filed any claims yet.</p>
            <Link to="/items/found" className="text-[#008080] font-medium hover:underline">
              Browse found items →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((c) => {
              const status = STATUS_STYLE[c.status] ?? STATUS_STYLE.pending
              const image = c.item?.images?.find((i) => i.is_primary) ?? c.item?.images?.[0]

              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4">
                  <Link
                    to={`/item/${c.item?.id}`}
                    className="h-16 w-16 rounded-lg bg-gray-100 overflow-hidden shrink-0"
                  >
                    {image ? (
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/item-images/${image.storage_path}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/item/${c.item?.id}`} className="font-medium text-[#0b2240] hover:underline truncate">
                        {c.item?.title}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Filed {new Date(c.created_at).toLocaleDateString()}
                    </p>

                    {c.status === 'rejected' && c.admin_notes && (
                      <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5 mt-2">
                        {c.admin_notes}
                      </p>
                    )}
                    {c.status === 'approved' && (
                      <p className="text-xs text-[#008080] bg-[#e6f2f2] rounded-lg px-2 py-1.5 mt-2">
                        Approved — bring your ID to the security desk to collect it.
                      </p>
                    )}

                    {c.proof_image_path && (
                      <button
                        onClick={() => loadOwnProof(c)}
                        className="text-xs text-gray-400 hover:text-[#008080] mt-2 block"
                      >
                        {proofUrls[c.id] ? '' : 'View my submitted proof'}
                      </button>
                    )}
                    {proofUrls[c.id] && (
                      <img src={proofUrls[c.id]} alt="" className="h-20 rounded-lg border mt-2" />
                    )}

                    {c.status === 'pending' && (
                      <button
                        onClick={() => handleWithdraw(c.id)}
                        disabled={acting === c.id}
                        className="text-xs text-gray-400 hover:text-red-500 mt-2 disabled:opacity-50"
                      >
                        {acting === c.id ? 'Withdrawing…' : 'Withdraw claim'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}