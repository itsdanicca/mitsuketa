import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase credentials. Copy .env.example to .env and fill it in, ' +
      'then restart the dev server — Vite only reads .env at startup.'
  )
}

/**
 * One client for the whole app. Never call createClient() anywhere else:
 * a second instance means a second auth session, and you get mysterious
 * logouts when the two disagree about the current token.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/* ------------------------------------------------------------------ */
/* College email rule                                                  */
/* ------------------------------------------------------------------ */

/**
 * Must stay in sync with is_valid_college_email() in the database.
 * The database is the real gate; this copy exists only so the signup
 * form can show a friendly message before making a round trip.
 */
export const USER_EMAIL_PATTERN = /^[a-z0-9._%+-]+\.ucl@phinmaed\.com$/i

export function isEligibleEmailFormat(email) {
  return USER_EMAIL_PATTERN.test((email || '').trim())
}

export const EMAIL_HINT = 'Use a PHINMA Union College email, ending in .ucl@phinmaed.com'

/** Server-side check — covers ordinary users and allowlisted admins. */
export async function isEligibleEmail(email) {
  const { data, error } = await supabase.rpc('check_email_eligible', {
    addr: (email || '').trim(),
  })
  return error ? false : Boolean(data)
}
/* ------------------------------------------------------------------ */
/* Storage helpers                                                     */
/* ------------------------------------------------------------------ */

export const BUCKETS = {
  items: 'item-images',
  proofs: 'claim-proofs',
  avatars: 'avatars',
}

/** Public URL for an item photo or avatar. Safe to render directly in <img>. */
export function publicUrl(bucket, path) {
  if (!path) return null
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

/**
 * Claim proofs live in a private bucket, so they need a short-lived
 * signed URL. Default: 60 seconds, long enough to render, short enough
 * that a leaked link is worthless.
 */
export async function signedUrl(bucket, path, seconds = 60) {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, seconds)
  if (error) throw error
  return data.signedUrl
}

/* ------------------------------------------------------------------ */
/* Error handling                                                      */
/* ------------------------------------------------------------------ */

/**
 * Postgres errors are precise but unreadable. Translate the ones our
 * constraints can actually raise into something a student can act on.
 */
export function readableError(error) {
  if (!error) return null
  const msg = error.message || ''

  if (error.code === '23505') {
    if (msg.includes('profiles_email_key')) return 'That email is already registered.'
    if (msg.includes('matches_unique_pair')) return 'These two items are already linked.'
    if (msg.includes('claims_one_open')) return 'You already have an open claim on this item.'
    return 'That record already exists.'
  }
  if (error.code === '23514') {
    if (msg.includes('profiles_email_domain')) return COLLEGE_EMAIL_HINT
    if (msg.includes('occurred_on')) return 'The date cannot be in the future.'
    return 'Some of the details entered are not valid.'
  }
  if (error.code === '42501' || msg.includes('row-level security')) {
    return 'You do not have permission to do that.'
  }
  if (msg.includes('Failed to fetch')) {
    return 'Cannot reach the server. Check your internet connection.'
  }
  return msg || 'Something went wrong. Please try again.'
}

/** Throws with a readable message, for use inside the api/ layer. */
export function unwrap({ data, error }) {
  if (error) throw new Error(readableError(error))
  return data
}