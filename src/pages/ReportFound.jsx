import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createItem, getCategories, getLocations } from '../lib/api/items'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * This is the "I found something, will hand it to security" report a
 * student files themselves. It is NOT the admin desk flow — that one
 * (logSurrenderedItem in api/admin.js) records the shelf/locker code and
 * pays the +50 XP the moment an admin confirms custody. This page just
 * creates the found-item report so it appears in the feed and can be
 * matched; the honesty points land once the item is physically
 * surrendered at the desk and an admin logs it there.
 */
export default function ReportFound() {
  const navigate = useNavigate()

  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    locationId: '',
    locationDetail: '',
    occurredOn: today(),
    occurredTime: '',
  })
  const [files, setFiles] = useState([])
  const [preview, setPreview] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
    getLocations().then(setLocations).catch(() => {})
  }, [])

  function handleFiles(e) {
    const picked = Array.from(e.target.files || []).slice(0, 3)
    setFiles(picked)
    setPreview(picked.map((f) => URL.createObjectURL(f)))
  }

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.categoryId) return setError('Please select a category.')
    if (!form.locationId) return setError('Please select where you found it.')
    if (!form.title.trim()) return setError('Please give the item a short title.')

    setSubmitting(true)
    try {
      const itemId = await createItem({ ...form, type: 'found' }, files)
      navigate(`/item/${itemId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-10 px-4">
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-[#0b2240] mb-1">Report a Found Item</h1>
        <p className="text-sm text-gray-500 mb-6">
          Found something? Log it here, then hand it in at the security
          desk — that's when your honesty points are credited.
        </p>

        <div className="mb-6 text-sm bg-[#e6f2f2] text-[#0b2240] rounded-lg px-3 py-2.5">
          Please still bring the item to the security desk. This report
          helps match it to its owner faster.
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Field label="Item title">
          <input
            required
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Blue Jansport backpack"
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={4}
            placeholder="Color, brand, distinguishing marks, contents, etc."
            className="input resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select required value={form.categoryId} onChange={set('categoryId')} className="input">
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Where you found it">
            <select required value={form.locationId} onChange={set('locationId')} className="input">
              <option value="">Select…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Additional location detail">
          <input
            value={form.locationDetail}
            onChange={set('locationDetail')}
            placeholder="e.g. left on a canteen table"
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date found">
            <input
              type="date"
              required
              max={today()}
              value={form.occurredOn}
              onChange={set('occurredOn')}
              className="input"
            />
          </Field>
          <Field label="Approx. time (optional)">
            <input type="time" value={form.occurredTime} onChange={set('occurredTime')} className="input" />
          </Field>
        </div>

        <Field label="Photo (recommended, up to 3)">
          <input type="file" accept="image/*" multiple onChange={handleFiles} className="text-sm" />
          {preview.length > 0 && (
            <div className="flex gap-2 mt-2">
              {preview.map((src, i) => (
                <img key={i} src={src} alt="" className="h-16 w-16 object-cover rounded-lg border" />
              ))}
            </div>
          )}
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#008080] text-white font-medium rounded-lg py-2.5 hover:bg-[#006666] disabled:opacity-60 transition mt-2"
        >
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[#0b2240] mb-1">{label}</label>
      {children}
    </div>
  )
}