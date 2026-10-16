import { supabase, unwrap, BUCKETS } from '../supabase'

/**
 * honesty_points and role are intentionally excluded from every update
 * here — both are write-protected server-side (the ledger trigger owns
 * points, the role guard trigger owns role), so there is no point
 * pretending the client can change them.
 */

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  return unwrap(
    await supabase
      .from('profiles')
      .select('id, full_name, email, student_number, course, year_level, department, avatar_url, honesty_points, created_at')
      .eq('id', user.id)
      .single()
  )
}

export async function updateMyProfile(fields) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  return unwrap(
    await supabase
      .from('profiles')
      .update({
        full_name: fields.fullName?.trim(),
        course: fields.course?.trim() || null,
        year_level: fields.yearLevel || null,
        department: fields.department?.trim() || null,
      })
      .eq('id', user.id)
      .select('id')
      .single()
  )
}

export async function uploadAvatar(file) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Avatar must be under 2 MB.')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.id}/avatar.${ext}`

  const { error: upErr } = await supabase.storage
    .from(BUCKETS.avatars)
    .upload(path, file, { upsert: true })
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

  const url = supabase.storage.from(BUCKETS.avatars).getPublicUrl(path).data.publicUrl
  // cache-bust so the new photo shows immediately instead of the old cached one
  const bustedUrl = `${url}?t=${Date.now()}`

  unwrap(
    await supabase.from('profiles').update({ avatar_url: bustedUrl }).eq('id', user.id).select('id').single()
  )
  return bustedUrl
}