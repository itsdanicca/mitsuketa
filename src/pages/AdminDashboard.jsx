import { useEffect, useState, useCallback } from 'react'
import {
  getAdminStats, logSurrenderedItem, listInventory, releaseItem,
  listClaims, reviewClaim, listSuggestedMatches, reviewMatch,
  findProfileByEmail,
} from '../lib/api/admin'
import { getCategories, getLocations } from '../lib/api/items'
import { getProofUrl } from '../lib/api/claims'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'surrender', label: 'Log Surrender' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'claims', label: 'Claims' },
  { key: 'matches', label: 'Suggested Matches' },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0b2240] mb-1">Admin Desk</h1>
        <p className="text-sm text-gray-500 mb-6">Security & CSDL operations</p>

        <div className="inline-flex bg-white rounded-lg p-1 shadow-sm mb-6 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === t.key ? 'bg-[#0b2240] text-white' : 'text-gray-500 hover:text-[#0b2240]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <Overview />}
        {tab === 'surrender' && <LogSurrender onDone={() => setTab('inventory')} />}
        {tab === 'inventory' && <Inventory />}
        {tab === 'claims' && <Claims />}
        {tab === 'matches' && <Matches />}
      </div>
    </div>
  )
}

/* ==================================================================== */
/* Overview                                                              */
/* ==================================================================== */

function Overview() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminStats().then(setStats).catch((e) => setError(e.message))
  }, [])

  if (error) return <ErrorBox message={error} />
  if (!stats) return <CardSkeleton count={5} />

  const cards = [
    { label: 'Active Lost Reports', value: stats.activeLost },
    { label: 'Active Found Reports', value: stats.activeFound },
    { label: 'Pending Claims', value: stats.pendingClaims, highlight: stats.pendingClaims > 0 },
    { label: 'Items in Storage', value: stats.itemsInStorage },
    { label: 'Items Returned', value: stats.itemsReturned },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl shadow-sm p-4">
          <p className={`text-2xl font-bold ${c.highlight ? 'text-amber-600' : 'text-[#0b2240]'}`}>
            {c.value}
          </p>
          <p className="text-xs text-gray-400 mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

/* ==================================================================== */
/* Log Surrender — the "Confirm Item Surrender" desk flow               */
/* ==================================================================== */

function LogSurrender({ onDone }) {
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', locationId: '', locationDetail: '',
    foundOn: new Date().toISOString().slice(0, 10), foundTime: '',
    storageType: 'shelf', storageCode: '', conditionNotes: '',
    surrenderedByEmail: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [finderProfile, setFinderProfile] = useState(null) // null = not looked up / not found
  const [lookingUp, setLookingUp] = useState(false)

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
    getLocations().then(setLocations).catch(() => {})
  }, [])

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      if (field === 'surrenderedByEmail') setFinderProfile(null) // stale once the email changes
    }
  }

  async function handleFinderBlur() {
    if (!form.surrenderedByEmail.trim()) return
    setLookingUp(true)
    try {
      const profile = await findProfileByEmail(form.surrenderedByEmail)
      setFinderProfile(profile) // null if genuinely not found — handled in the UI below
    } catch {
      setFinderProfile(null)
    } finally {
      setLookingUp(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.categoryId || !form.locationId) return setError('Category and location are required.')
    if (!form.storageCode.trim()) return setError('Storage code is required (e.g. SHELF-A3).')
    if (form.surrenderedByEmail.trim() && !finderProfile) {
      return setError('That email did not match a registered account — leave it blank for an anonymous surrender, or double-check it.')
    }

    setSubmitting(true)
    try {
      const result = await logSurrenderedItem({ ...form, surrenderedBy: finderProfile?.id ?? null })
      setSuccess(result)
      setForm((f) => ({ ...f, title: '', description: '', storageCode: '', conditionNotes: '', surrenderedByEmail: '' }))
      setFinderProfile(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 max-w-xl">
      <h2 className="font-semibold text-[#0b2240] mb-4">Confirm Item Surrender</h2>

      {error && <ErrorBox message={error} />}
      {success && (
        <div className="mb-4 text-sm text-[#008080] bg-[#e6f2f2] rounded-lg px-3 py-2.5">
          Logged and stored at {form.storageCode || 'the specified location'}.{' '}
          {success.itemId && (
            <button type="button" onClick={onDone} className="underline font-medium">
              View in inventory →
            </button>
          )}
        </div>
      )}

      <Field label="Item title">
        <input required value={form.title} onChange={set('title')} className="input" />
      </Field>
      <Field label="Description">
        <textarea value={form.description} onChange={set('description')} rows={3} className="input resize-none" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <select required value={form.categoryId} onChange={set('categoryId')} className="input">
            <option value="">Select…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Found at">
          <select required value={form.locationId} onChange={set('locationId')} className="input">
            <option value="">Select…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Storage type">
          <select value={form.storageType} onChange={set('storageType')} className="input">
            <option value="shelf">Shelf</option>
            <option value="locker">Locker</option>
            <option value="cabinet">Cabinet</option>
            <option value="safe">Safe</option>
          </select>
        </Field>
        <Field label="Storage code">
          <input required value={form.storageCode} onChange={set('storageCode')} placeholder="e.g. SHELF-A3" className="input" />
        </Field>
      </div>
      <Field label="Finder's email (optional — awards +50 XP)">
        <input
          type="email"
          value={form.surrenderedByEmail}
          onChange={set('surrenderedByEmail')}
          onBlur={handleFinderBlur}
          placeholder="Leave blank if surrendered anonymously"
          className="input"
        />
        {lookingUp && <p className="text-xs text-gray-400 mt-1">Looking up…</p>}
        {!lookingUp && finderProfile && (
          <p className="text-xs text-[#008080] mt-1">✓ {finderProfile.full_name} — will receive +50 XP</p>
        )}
        {!lookingUp && !finderProfile && form.surrenderedByEmail.trim() && (
          <p className="text-xs text-amber-600 mt-1">No account found with that email.</p>
        )}
      </Field>
      <Field label="Condition notes">
        <input value={form.conditionNotes} onChange={set('conditionNotes')} className="input" />
      </Field>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#008080] text-white font-medium rounded-lg py-2.5 hover:bg-[#006666] disabled:opacity-60 transition mt-2"
      >
        {submitting ? 'Logging…' : 'Confirm Item Surrender'}
      </button>
    </form>
  )
}

/* ==================================================================== */
/* Inventory                                                             */
/* ==================================================================== */

function Inventory() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [releasing, setReleasing] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    listInventory().then(setRecords).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRelease(record) {
    const email = window.prompt("Recipient's email (who is collecting it):")
    if (email === null) return // cancelled

    let releasedTo = null
    if (email.trim()) {
      const profile = await findProfileByEmail(email).catch(() => null)
      if (!profile) {
        window.alert('No account found with that email — release cancelled. Leave the prompt blank to release without linking a recipient.')
        return
      }
      releasedTo = profile.id
    }

    const notes = window.prompt('Release notes (optional):') ?? ''
    setReleasing(record.id)
    try {
      await releaseItem({ inventoryId: record.id, itemId: record.item.id, releasedTo, notes })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setReleasing(null)
    }
  }

  if (loading) return <CardSkeleton count={3} />
  if (error) return <ErrorBox message={error} />

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {records.length === 0 ? (
        <p className="p-8 text-center text-gray-400 text-sm">No items currently in storage.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {records.map((r) => (
            <li key={r.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#0b2240] truncate">{r.item?.title}</p>
                <p className="text-xs text-gray-400">
                  {r.storage_type.toUpperCase()} {r.storage_code} · found at {r.item?.location?.name}
                  {r.surrendered_by && ` · by ${r.surrendered_by.full_name}`}
                </p>
              </div>
              <button
                onClick={() => handleRelease(r)}
                disabled={releasing === r.id}
                className="text-sm text-[#008080] font-medium hover:underline disabled:opacity-50"
              >
                {releasing === r.id ? 'Releasing…' : 'Mark released'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ==================================================================== */
/* Claims                                                                 */
/* ==================================================================== */

function Claims() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(null)
  const [proofUrls, setProofUrls] = useState({})

  const load = useCallback(() => {
    setLoading(true)
    listClaims('pending').then(setClaims).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function viewProof(claim) {
    if (!claim.proof_image_path || proofUrls[claim.id]) return
    const url = await getProofUrl(claim.proof_image_path).catch(() => null)
    if (url) setProofUrls((p) => ({ ...p, [claim.id]: url }))
  }

  async function handleReview(claim, approve) {
    const notes = window.prompt(approve ? 'Approval notes (optional):' : 'Reason for rejection:') ?? ''
    if (!approve && !notes.trim()) return
    setActing(claim.id)
    try {
      await reviewClaim({ claimId: claim.id, itemId: claim.item.id, approve, notes })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setActing(null)
    }
  }

  if (loading) return <CardSkeleton count={2} />
  if (error) return <ErrorBox message={error} />

  return (
    <div className="space-y-4">
      {claims.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
          No pending claims.
        </div>
      ) : (
        claims.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-[#0b2240]">{c.item?.title}</p>
                <p className="text-xs text-gray-400">
                  Claimed by {c.claimant?.full_name} ({c.claimant?.email})
                </p>
              </div>
              {c.match && (
                <span className="text-xs bg-[#e6f2f2] text-[#008080] px-2 py-1 rounded-full">
                  AI match: {c.match.similarity_score}%
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-3">{c.proof_description}</p>

            {c.proof_image_path && (
              <button
                onClick={() => viewProof(c)}
                className="text-xs text-[#008080] font-medium hover:underline mb-3 block"
              >
                {proofUrls[c.id] ? '' : 'Load supporting photo'}
              </button>
            )}
            {proofUrls[c.id] && (
              <img src={proofUrls[c.id]} alt="Proof" className="h-32 rounded-lg border mb-3" />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleReview(c, true)}
                disabled={acting === c.id}
                className="flex-1 bg-[#008080] text-white text-sm font-medium rounded-lg py-2 hover:bg-[#006666] disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => handleReview(c, false)}
                disabled={acting === c.id}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg py-2 hover:bg-gray-50 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

/* ==================================================================== */
/* Suggested Matches                                                     */
/* ==================================================================== */

function Matches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    listSuggestedMatches().then(setMatches).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleReview(match, confirm) {
    setActing(match.id)
    try {
      await reviewMatch({ matchId: match.id, confirm })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setActing(null)
    }
  }

  if (loading) return <CardSkeleton count={2} />
  if (error) return <ErrorBox message={error} />

  return (
    <div className="space-y-4">
      {matches.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
          No suggested matches above threshold right now.
        </div>
      ) : (
        matches.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs bg-[#e6f2f2] text-[#008080] px-2 py-1 rounded-full font-medium">
                {m.similarity_score}% match
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Lost report</p>
                <p className="font-medium text-[#0b2240] text-sm">{m.lost_item?.title}</p>
                <p className="text-xs text-gray-400">by {m.lost_item?.reporter?.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Found report</p>
                <p className="font-medium text-[#0b2240] text-sm">{m.found_item?.title}</p>
                <p className="text-xs text-gray-400">{m.found_item?.location?.name}</p>
              </div>
            </div>

            {m.ai_rationale && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-3">{m.ai_rationale}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleReview(m, true)}
                disabled={acting === m.id}
                className="flex-1 bg-[#008080] text-white text-sm font-medium rounded-lg py-2 hover:bg-[#006666] disabled:opacity-60"
              >
                Confirm match
              </button>
              <button
                onClick={() => handleReview(m, false)}
                disabled={acting === m.id}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg py-2 hover:bg-gray-50 disabled:opacity-60"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

/* ==================================================================== */
/* Shared bits                                                           */
/* ==================================================================== */

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[#0b2240] mb-1">{label}</label>
      {children}
    </div>
  )
}

function ErrorBox({ message }) {
  return (
    <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
      {message}
    </div>
  )
}

function CardSkeleton({ count }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm p-6 animate-pulse h-24" />
      ))}
    </div>
  )
}