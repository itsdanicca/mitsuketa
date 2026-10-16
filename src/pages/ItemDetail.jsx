import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getItem } from '../lib/api/items'
import { fileClaim } from '../lib/api/claims'
import { useAuth } from '../context/AuthContext'

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [item, setItem] = useState(null)
  const [activePhoto, setActivePhoto] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showClaimForm, setShowClaimForm] = useState(false)
  const [proofDescription, setProofDescription] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [claimError, setClaimError] = useState('')
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [claimSent, setClaimSent] = useState(false)

  useEffect(() => {
    setLoading(true)
    getItem(id)
      .then(setItem)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleClaimSubmit(e) {
    e.preventDefault()
    setClaimError('')
    if (proofDescription.trim().length < 10) {
      setClaimError('Please describe at least one specific detail that proves ownership (10+ characters).')
      return
    }
    setClaimSubmitting(true)
    try {
      await fileClaim({ itemId: item.id, proofDescription, proofFile })
      setClaimSent(true)
      setShowClaimForm(false)
    } catch (err) {
      setClaimError(err.message)
    } finally {
      setClaimSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center text-gray-400">Loading…</div>
  }
  if (error || !item) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">{error || 'Item not found.'}</p>
        <button onClick={() => navigate(-1)} className="text-[#008080] font-medium hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const isOwnReport = item.reporter?.id === user?.id
  const isFound = item.type === 'found'
  const canClaim = isFound && !isOwnReport && ['active', 'matched'].includes(item.status)

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-[#0b2240] mb-4">
          ← Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden grid md:grid-cols-2">
          {/* Photos */}
          <div>
            <div className="aspect-square bg-gray-100">
              {item.images?.length ? (
                <img
                  src={item.images[activePhoto]?.url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">No photo</div>
              )}
            </div>
            {item.images?.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {item.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActivePhoto(i)}
                    className={`h-14 w-14 rounded-lg overflow-hidden border-2 shrink-0 ${
                      i === activePhoto ? 'border-[#008080]' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isFound ? 'bg-[#e6f2f2] text-[#008080]' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {isFound ? 'Found' : 'Lost'}
              </span>
              <span className="text-xs text-gray-400">{item.category?.name}</span>
            </div>

            <h1 className="text-2xl font-bold text-[#0b2240] mb-2">{item.title}</h1>
            <p className="text-gray-600 whitespace-pre-wrap mb-4">{item.description || 'No description provided.'}</p>

            <dl className="text-sm space-y-1.5 mb-6">
              <Row label={isFound ? 'Found on' : 'Lost on'} value={new Date(item.occurred_on).toLocaleDateString()} />
              <Row label="Location" value={item.location?.name || 'Unknown'} />
              {item.location_detail && <Row label="Detail" value={item.location_detail} />}
              <Row label="Reported by" value={item.reporter?.full_name || 'Anonymous'} />
            </dl>

            {claimSent && (
              <div className="mb-4 text-sm text-[#008080] bg-[#e6f2f2] rounded-lg px-3 py-2.5">
                Claim submitted — an admin will review it and reach out.
              </div>
            )}

            {isOwnReport && (
              <div className="text-sm text-gray-400 border rounded-lg px-3 py-2.5">This is your own report.</div>
            )}

            {canClaim && !claimSent && !showClaimForm && (
              <button
                onClick={() => setShowClaimForm(true)}
                className="w-full bg-[#008080] text-white font-medium rounded-lg py-2.5 hover:bg-[#006666] transition"
              >
                This is mine — file a claim
              </button>
            )}

            {showClaimForm && (
              <form onSubmit={handleClaimSubmit} className="border-t pt-4 mt-2">
                <label className="block text-sm font-medium text-[#0b2240] mb-1">
                  Prove it's yours
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Describe something only the owner would know — a scratch, contents,
                  a sticker, a serial number.
                </p>
                {claimError && (
                  <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {claimError}
                  </div>
                )}
                <textarea
                  value={proofDescription}
                  onChange={(e) => setProofDescription(e.target.value)}
                  rows={3}
                  className="input resize-none mb-3"
                  placeholder="e.g. There's a small crack on the bottom-left corner and a keychain shaped like..."
                />
                <label className="block text-sm font-medium text-[#0b2240] mb-1">
                  Supporting photo (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="text-sm mb-4"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowClaimForm(false)}
                    className="flex-1 border border-gray-200 text-gray-600 font-medium rounded-lg py-2.5 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={claimSubmitting}
                    className="flex-1 bg-[#008080] text-white font-medium rounded-lg py-2.5 hover:bg-[#006666] disabled:opacity-60 transition"
                  >
                    {claimSubmitting ? 'Submitting…' : 'Submit claim'}
                  </button>
                </div>
              </form>
            )}

            {!isFound && !isOwnReport && (
              <div className="text-sm text-gray-500 border rounded-lg px-3 py-2.5">
                Think you found this?{' '}
                <Link to="/report-found" className="text-[#008080] font-medium hover:underline">
                  Report it as found
                </Link>{' '}
                so it can be matched.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-[#0b2240] font-medium text-right">{value}</dd>
    </div>
  )
}