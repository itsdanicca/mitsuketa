import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Route this at /verify — matches the emailRedirectTo set in
 * AuthContext's signUp(). Supabase appends its own tokens to the URL;
 * getSessionFromUrl (via detectSessionInUrl: true on the client) has
 * already turned that into a session by the time this component reads it.
 */
export default function VerifyEmail() {
    
  const [status, setStatus] = useState('checking') // checking | success | error
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session) {
        setStatus('success')
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
      } else {
        setStatus('error')
      }
    })

    return () => { active = false }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        {status === 'checking' && (
          <>
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-[#008080] border-t-transparent animate-spin mb-4" />
            <p className="text-[#0b2240] font-medium">Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <p className="text-[#0b2240] font-semibold text-lg mb-1">Email verified</p>
            <p className="text-sm text-gray-500">Taking you to your dashboard…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-[#0b2240] font-semibold text-lg mb-2">Link expired or invalid</p>
            <p className="text-sm text-gray-500 mb-4">
              Verification links expire after a while. Try signing in — if your
              account still isn't verified, you can request a new link there.
            </p>
            <Link to="/login" className="text-[#008080] font-medium hover:underline">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}