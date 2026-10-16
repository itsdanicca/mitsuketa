import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isEligibleEmailFormat, isEligibleEmail, EMAIL_HINT, readableError } from '../lib/supabase'

const AuthContext = createContext(null)

/**
 * Wrap <App /> in this once, at the top level (see App.jsx below).
 *
 * Exposes:
 *   user            — the Supabase auth user, or null
 *   profile         — the row from `profiles` (has .role), or null
 *   role            — 'user' | 'admin' | null, shortcut for profile.role
 *   isAdmin         — boolean
 *   loading         — true until the initial session check finishes
 *   signUp / signIn / signOut / resendVerification / resetPassword
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, honesty_points, avatar_url, is_active')
      .eq('id', userId)
      .single()

    // A missing profile usually means the signup trigger hasn't run yet
    // (rare race right after signUp) — leave it null, the next auth
    // event will retry.
    setProfile(error ? null : data)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setUser(session?.user ?? null)
      loadProfile(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        loadProfile(session?.user?.id)
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  /**
   * Registration. Checks eligibility client-side first for instant
   * feedback, but the database is the real gate (profiles_email_allowed
   * constraint) — a bypassed client check still fails server-side.
   */
  const signUp = useCallback(async ({ email, password, fullName }) => {
    const trimmed = email.trim()

    if (!isEligibleEmailFormat(trimmed)) {
      const eligible = await isEligibleEmail(trimmed)
      if (!eligible) throw new Error(EMAIL_HINT)
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: {
        data: { full_name: fullName?.trim() },
        emailRedirectTo: `${window.location.origin}/verify`,
      },
    })
    if (error) throw new Error(readableError(error))

    // Supabase returns a user with no session when email confirmation
    // is required — that's the expected path here, not an error.
    return { needsVerification: !data.session, user: data.user }
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please verify your email before signing in — check your inbox.')
      }
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Incorrect email or password.')
      }
      throw new Error(readableError(error))
    }
    return data
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const resendVerification = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/verify` },
    })
    if (error) throw new Error(readableError(error))
  }, [])

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw new Error(readableError(error))
  }, [])

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(readableError(error))
  }, [])

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    loading,
    signUp,
    signIn,
    signOut,
    resendVerification,
    resetPassword,
    updatePassword,
    refreshProfile: () => loadProfile(user?.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() must be called inside <AuthProvider>')
  return ctx
}