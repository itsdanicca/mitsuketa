import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn({ email, password })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#0b2240]">Welcome Back</h2>
          <p className="text-sm text-gray-500 mt-1">Sign in with your @union.phinma.edu.ph email</p>
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

          <div>
            <label className="block text-sm font-medium text-[#0b2240] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-[#0b2240] focus:outline-none focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#008080] hover:bg-[#006666] text-white font-medium rounded-lg py-2.5 text-sm transition disabled:opacity-60 mt-2"
          >
            {submitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
          <Link to="/signup" className="text-[#008080] font-medium hover:underline">
            Create account
          </Link>
          <Link to="/forgot-password" className="text-gray-500 hover:text-[#0b2240]">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  )
}