import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-[#e6f2f2] text-[#008080] rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-[#0b2240] mb-2">Check Your Email</h2>
          <p className="text-sm text-gray-500 mb-6">
            We sent password reset instructions to <strong className="text-[#0b2240]">{email}</strong>.
          </p>
          <Link
            to="/login"
            className="inline-block bg-[#008080] hover:bg-[#006666] text-white text-sm font-medium rounded-lg px-6 py-2.5 transition"
          >
            Return to Log In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#0b2240]">Reset Password</h2>
          <p className="text-sm text-gray-500 mt-1">Enter your email address to receive a recovery link</p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0b2240] mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@union.phinma.edu.ph"
              required
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-[#0b2240] focus:outline-none focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#008080] hover:bg-[#006666] text-white font-medium rounded-lg py-2.5 text-sm transition disabled:opacity-60 mt-2"
          >
            {submitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <Link to="/login" className="text-sm text-[#008080] font-medium hover:underline">
            ← Back to Log In
          </Link>
        </div>
      </div>
    </div>
  )
}