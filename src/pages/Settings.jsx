import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyProfile, updateMyProfile, uploadAvatar } from '../lib/api/profile'

export default function Settings() {
  const { refreshProfile, updatePassword, isAdmin } = useAuth()

  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ fullName: '', course: '', yearLevel: '', department: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p)
        setForm({
          fullName: p.full_name || '',
          course: p.course || '',
          yearLevel: p.year_level ?? '',
          department: p.department || '',
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setSaved(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!form.fullName.trim()) return setError('Name cannot be empty.')

    setSaving(true)
    try {
      await updateMyProfile(form)
      await refreshProfile()
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setError('')
    try {
      const url = await uploadAvatar(file)
      setProfile((p) => ({ ...p, avatar_url: url }))
      await refreshProfile()
    } catch (err) {
      setError(err.message)
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPwError('')
    setPwSaved(false)
    if (pw.next.length < 8) return setPwError('Password must be at least 8 characters.')
    if (pw.next !== pw.confirm) return setPwError('Passwords do not match.')

    setPwSaving(true)
    try {
      await updatePassword(pw.next)
      setPw({ next: '', confirm: '' })
      setPwSaved(true)
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center text-gray-400">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b2240] mb-1">Settings</h1>
          <p className="text-sm text-gray-500">Manage your profile and account.</p>
        </div>

        {/* Profile */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-[#0b2240] mb-4">Profile</h2>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {saved && (
            <div className="mb-4 text-sm text-[#008080] bg-[#e6f2f2] rounded-lg px-3 py-2">
              Saved.
            </div>
          )}

          <div className="flex items-center gap-4 mb-5">
            <div className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl text-gray-400">
                  {profile?.full_name?.[0] ?? '?'}
                </div>
              )}
            </div>
            <label className="text-sm text-[#008080] font-medium hover:underline cursor-pointer">
              {avatarUploading ? 'Uploading…' : 'Change photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
            </label>
          </div>

          <Field label="Full name">
            <input required value={form.fullName} onChange={set('fullName')} className="input" />
          </Field>

          <Field label="Email">
            <input value={profile?.email ?? ''} disabled className="input bg-gray-50 text-gray-400" />
          </Field>

          {!isAdmin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Course">
                  <input value={form.course} onChange={set('course')} placeholder="e.g. BSIT" className="input" />
                </Field>
                <Field label="Year level">
                  <input
                    type="number" min={1} max={6}
                    value={form.yearLevel}
                    onChange={set('yearLevel')}
                    className="input"
                  />
                </Field>
              </div>
              <Field label="Department">
                <input value={form.department} onChange={set('department')} className="input" />
              </Field>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-400">
              Honesty points: <span className="font-semibold text-[#008080]">{profile?.honesty_points ?? 0}</span>
            </p>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#008080] text-white text-sm font-medium rounded-lg px-5 py-2 hover:bg-[#006666] disabled:opacity-60 transition"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        {/* Password */}
        <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-[#0b2240] mb-4">Change password</h2>

          {pwError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {pwError}
            </div>
          )}
          {pwSaved && (
            <div className="mb-4 text-sm text-[#008080] bg-[#e6f2f2] rounded-lg px-3 py-2">
              Password updated.
            </div>
          )}

          <Field label="New password">
            <input
              type="password" minLength={8}
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              className="input"
            />
          </Field>

          <button
            type="submit"
            disabled={pwSaving}
            className="w-full bg-[#0b2240] text-white text-sm font-medium rounded-lg py-2.5 hover:bg-[#0e2c52] disabled:opacity-60 transition"
          >
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
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