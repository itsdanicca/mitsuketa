import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { EMAIL_HINT } from '../lib/supabase'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    try {
      const { needsVerification } = await signUp({ fullName, email, password })
      if (needsVerification) setSentTo(email)
      else navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-[#0b2240] font-semibold text-lg mb-2">Check your inbox</p>
          <p className="text-sm text-gray-500 mb-6">
            We sent a verification link to <span className="font-medium">{sentTo}</span>.
            Verify your email, then sign in.
          </p>
          <Link to="/login" className="text-[#008080] font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#f4f6f9]">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0b2240] items-center justify-center p-12">
        <div className="max-w-sm text-white">
          <h1 className="text-3xl font-bold mb-3">MITSUKETA</h1>
          <p className="text-white/70">
            Create an account with your PHINMA Union College email to start
            reporting and tracking items.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-[#0b2240] mb-1">Create your account</h2>
          <p className="text-sm text-gray-500 mb-6">{EMAIL_HINT}</p>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium text-[#0b2240] mb-1">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 mb-4 outline-none focus:border-[#008080] focus:ring-1 focus:ring-[#008080]"
          />

          <label className="block text-sm font-medium text-[#0b2240] mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juandelacruz.ucl@phinmaed.com"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 mb-4 outline-none focus:border-[#008080] focus:ring-1 focus:ring-[#008080]"
          />

          <label className="block text-sm font-medium text-[#0b2240] mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 mb-4 outline-none focus:border-[#008080] focus:ring-1 focus:ring-[#008080]"
          />

          <label className="block text-sm font-medium text-[#0b2240] mb-1">Confirm password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 mb-6 outline-none focus:border-[#008080] focus:ring-1 focus:ring-[#008080]"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#008080] text-white font-medium rounded-lg py-2.5 hover:bg-[#006666] disabled:opacity-60 transition"
          >
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>

          <p className="text-sm text-gray-500 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#008080] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}