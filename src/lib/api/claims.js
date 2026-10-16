import { supabase, unwrap, BUCKETS, signedUrl } from '../supabase'

const CLAIM_SELECT = `
  id, status, proof_description, proof_image_path, admin_notes,
  created_at, reviewed_at, collected_at,
  item:items (
    id, title, type, status, occurred_on,
    category:categories ( name, icon ),
    location:campus_locations ( name ),
    images:item_images ( storage_path, is_primary )
  )
`

/* ------------------------------------------------------------------ */
/* Claims                                                              */
/* ------------------------------------------------------------------ */

/**
 * File a claim on a found item.
 * The proof description is what the admin reads to decide — the schema
 * enforces a 10-character minimum so "it's mine" does not get through.
 */
export async function fileClaim({ itemId, proofDescription, proofFile, matchId = null }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  let proofPath = null
  if (proofFile) {
    if (proofFile.size > 5 * 1024 * 1024) {
      throw new Error('Proof image must be under 5 MB.')
    }
    const ext = proofFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    proofPath = `${user.id}/${itemId}-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from(BUCKETS.proofs)
      .upload(proofPath, proofFile, { upsert: false })
    if (error) throw new Error(`Proof upload failed: ${error.message}`)
  }

  return unwrap(
    await supabase
      .from('claims')
      .insert({
        item_id: itemId,
        claimant_id: user.id,
        match_id: matchId,
        proof_description: proofDescription?.trim(),
        proof_image_path: proofPath,
      })
      .select('id')
      .single()
  )
}

/** My Claims page. RLS already scopes this to the signed-in user. */
export async function listMyClaims() {
  return unwrap(
    await supabase
      .from('claims')
      .select(CLAIM_SELECT)
      .order('created_at', { ascending: false })
  )
}

export async function withdrawClaim(claimId) {
  return unwrap(
    await supabase
      .from('claims')
      .update({ status: 'rejected', admin_notes: 'Withdrawn by claimant' })
      .eq('id', claimId)
      .select('id')
      .single()
  )
}

/** Proof images are private — fetch a short-lived link when displaying one. */
export async function getProofUrl(path) {
  return signedUrl(BUCKETS.proofs, path, 120)
}

/* ------------------------------------------------------------------ */
/* Matches (student view)                                              */
/* ------------------------------------------------------------------ */

/**
 * AI-suggested matches against this student's own reports.
 * RLS restricts the result to matches touching an item they reported.
 */
export async function listMyMatches() {
  return unwrap(
    await supabase
      .from('matches')
      .select(`
        id, similarity_score, ai_rationale, status, created_at,
        lost_item:items!matches_lost_item_id_fkey (
          id, title, occurred_on,
          images:item_images ( storage_path, is_primary )
        ),
        found_item:items!matches_found_item_id_fkey (
          id, title, occurred_on, status,
          location:campus_locations ( name ),
          images:item_images ( storage_path, is_primary )
        )
      `)
      .in('status', ['suggested', 'confirmed'])
      .order('similarity_score', { ascending: false })
  )
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export async function listNotifications(limit = 20) {
  return unwrap(
    await supabase
      .from('notifications')
      .select('id, title, body, kind, item_id, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
  )
}

export async function markNotificationRead(id) {
  return unwrap(
    await supabase.from('notifications').update({ is_read: true }).eq('id', id).select('id').single()
  )
}

/**
 * Live notification stream. Call in a useEffect and return the cleanup:
 *
 *   useEffect(() => subscribeToNotifications(userId, n => ...), [userId])
 */
export function subscribeToNotifications(userId, onNotification) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `profile_id=eq.${userId}`,
      },
      (payload) => onNotification(payload.new)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}