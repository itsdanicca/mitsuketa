import { supabase, unwrap } from '../supabase'

/**
 * Every function here is guarded by is_admin() inside Postgres. A student
 * who calls them gets a permission error, not data — so the frontend
 * route guard is convenience, not security.
 */

/* ------------------------------------------------------------------ */
/* Profile lookup — turns an email typed at the desk into a real id    */
/* ------------------------------------------------------------------ */

/**
 * Every profile is readable by any signed-in user (the "profiles
 * readable" policy), so this works without any special admin grant.
 * Returns null rather than throwing on no-match, since "not found" is
 * an expected outcome at the desk, not an error.
 */
export async function findProfileByEmail(email) {
  const trimmed = (email || '').trim().toLowerCase()
  if (!trimmed) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', trimmed)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

/* ------------------------------------------------------------------ */
/* Logging a surrendered item                                          */
/* ------------------------------------------------------------------ */

/**
 * The security desk workflow, as one transaction-ish sequence:
 *
 *   1. create the found-item record
 *   2. create the inventory record with its shelf/locker code
 *
 * Step 2 fires award_surrender_points() in the database, which is what
 * pays the finder +50 XP. That is the ONLY place points are awarded —
 * no client code ever writes to points_ledger.
 *
 * @param {string|null} fields.surrenderedBy  profile id of the finder,
 *        or null if they handed it in anonymously (no points awarded)
 */
export async function logSurrenderedItem(fields) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  const item = unwrap(
    await supabase
      .from('items')
      .insert({
        type: 'found',
        reporter_id: fields.surrenderedBy || user.id,
        title: fields.title?.trim(),
        description: fields.description?.trim() || null,
        category_id: fields.categoryId,
        location_id: fields.locationId,
        location_detail: fields.locationDetail?.trim() || null,
        occurred_on: fields.foundOn,
        occurred_time: fields.foundTime || null,
      })
      .select('id')
      .single()
  )

  try {
    const inventory = unwrap(
      await supabase
        .from('inventory_records')
        .insert({
          item_id: item.id,
          storage_type: fields.storageType || 'shelf',
          storage_code: fields.storageCode?.trim(),
          condition_notes: fields.conditionNotes?.trim() || null,
          surrendered_by: fields.surrenderedBy || null,
          received_by: user.id,
        })
        .select('id')
        .single()
    )

    await logAudit('item_surrendered', 'items', item.id, {
      storage_code: fields.storageCode,
      surrendered_by: fields.surrenderedBy,
    })

    supabase.functions.invoke('analyze-item', { body: { itemId: item.id } }).catch(() => {})

    return { itemId: item.id, inventoryId: inventory.id }
  } catch (err) {
    // No inventory record means no custody trail — roll the item back
    // rather than leave a found item nobody can physically locate.
    await supabase.from('items').delete().eq('id', item.id)
    throw err
  }
}

/** Current physical holdings, for the inventory table on the admin desk. */
export async function listInventory({ search, includeReleased = false } = {}) {
  let q = supabase
    .from('inventory_records')
    .select(`
      id, storage_type, storage_code, condition_notes,
      received_at, released_at, release_notes,
      item:items (
        id, title, status, occurred_on,
        category:categories ( name, icon ),
        location:campus_locations ( name ),
        images:item_images ( storage_path, is_primary )
      ),
      surrendered_by:profiles!inventory_records_surrendered_by_fkey ( id, full_name ),
      received_by:profiles!inventory_records_received_by_fkey ( id, full_name )
    `)
    .order('received_at', { ascending: false })

  if (!includeReleased) q = q.is('released_at', null)
  if (search?.trim()) q = q.ilike('storage_code', `%${search.trim()}%`)

  return unwrap(await q)
}

/** Final step: the owner physically collects the item. */
export async function releaseItem({ inventoryId, itemId, releasedTo, notes }) {
  unwrap(
    await supabase
      .from('inventory_records')
      .update({
        released_to: releasedTo,
        released_at: new Date().toISOString(),
        release_notes: notes?.trim() || null,
      })
      .eq('id', inventoryId)
      .select('id')
      .single()
  )

  unwrap(
    await supabase.from('items').update({ status: 'returned' }).eq('id', itemId).select('id').single()
  )

  await logAudit('item_released', 'items', itemId, { released_to: releasedTo })
}

/* ------------------------------------------------------------------ */
/* Claim verification                                                  */
/* ------------------------------------------------------------------ */

export async function listClaims(status = 'pending') {
  let q = supabase
    .from('claims')
    .select(`
      id, status, proof_description, proof_image_path, admin_notes,
      created_at, reviewed_at,
      claimant:profiles!claims_claimant_id_fkey ( id, full_name, email, student_number, course, avatar_url ),
      item:items (
        id, title, description, occurred_on, ai_description, ai_attributes,
        category:categories ( name ),
        location:campus_locations ( name ),
        images:item_images ( storage_path, is_primary )
      ),
      match:matches ( id, similarity_score, ai_rationale )
    `)
    .order('created_at', { ascending: true })

  if (status) q = q.eq('status', status)
  return unwrap(await q)
}

/**
 * Approve or reject. Approving flips the item to 'claimed'; the item only
 * becomes 'returned' once it is physically handed over via releaseItem().
 */
export async function reviewClaim({ claimId, itemId, approve, notes }) {
  const { data: { user } } = await supabase.auth.getUser()

  unwrap(
    await supabase
      .from('claims')
      .update({
        status: approve ? 'approved' : 'rejected',
        admin_notes: notes?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .select('id')
      .single()
  )

  if (approve) {
    unwrap(
      await supabase.from('items').update({ status: 'claimed' }).eq('id', itemId).select('id').single()
    )
  }

  await logAudit(approve ? 'claim_approved' : 'claim_rejected', 'claims', claimId, { notes })
}

/* ------------------------------------------------------------------ */
/* AI match review                                                     */
/* ------------------------------------------------------------------ */

/** "Top Suggested Matches" on the admin dashboard. */
export async function listSuggestedMatches(minScore = 55) {
  return unwrap(
    await supabase
      .from('matches')
      .select(`
        id, similarity_score, visual_score, attribute_score,
        ai_rationale, status, created_at,
        lost_item:items!matches_lost_item_id_fkey (
          id, title, description, occurred_on, ai_attributes,
          reporter:profiles!items_reporter_id_fkey ( id, full_name, email ),
          category:categories ( name ),
          location:campus_locations ( name ),
          images:item_images ( storage_path, is_primary )
        ),
        found_item:items!matches_found_item_id_fkey (
          id, title, description, occurred_on, ai_attributes,
          category:categories ( name ),
          location:campus_locations ( name ),
          images:item_images ( storage_path, is_primary )
        )
      `)
      .eq('status', 'suggested')
      .gte('similarity_score', minScore)
      .order('similarity_score', { ascending: false })
      .limit(25)
  )
}

/** Run the vector search on demand, e.g. a "Find matches" button. */
export async function findMatchesFor(itemId, threshold = 55) {
  return unwrap(
    await supabase.rpc('find_similar_items', {
      source_item_id: itemId,
      match_threshold: threshold,
      max_results: 10,
    })
  )
}

export async function reviewMatch({ matchId, confirm }) {
  const { data: { user } } = await supabase.auth.getUser()

  const match = unwrap(
    await supabase
      .from('matches')
      .update({
        status: confirm ? 'confirmed' : 'dismissed',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', matchId)
      .select('id, lost_item_id, found_item_id')
      .single()
  )

  if (confirm) {
    await supabase
      .from('items')
      .update({ status: 'matched' })
      .in('id', [match.lost_item_id, match.found_item_id])

    const { data: lost } = await supabase
      .from('items')
      .select('reporter_id, title')
      .eq('id', match.lost_item_id)
      .single()

    if (lost) {
      await supabase.from('notifications').insert({
        profile_id: lost.reporter_id,
        kind: 'match',
        title: 'We may have found your item',
        body: `A surrendered item appears to match your report "${lost.title}". Visit the security desk to claim it.`,
        item_id: match.found_item_id,
      })
    }
  }

  await logAudit(confirm ? 'match_confirmed' : 'match_dismissed', 'matches', matchId, null)
}

/* ------------------------------------------------------------------ */
/* Dashboard stats + audit                                             */
/* ------------------------------------------------------------------ */

export async function getAdminStats() {
  const [lost, found, pendingClaims, inStorage, returned] = await Promise.all([
    supabase.from('items').select('id', { count: 'exact', head: true })
      .eq('type', 'lost').eq('status', 'active'),
    supabase.from('items').select('id', { count: 'exact', head: true })
      .eq('type', 'found').eq('status', 'active'),
    supabase.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('inventory_records').select('id', { count: 'exact', head: true }).is('released_at', null),
    supabase.from('items').select('id', { count: 'exact', head: true }).eq('status', 'returned'),
  ])

  return {
    activeLost: lost.count ?? 0,
    activeFound: found.count ?? 0,
    pendingClaims: pendingClaims.count ?? 0,
    itemsInStorage: inStorage.count ?? 0,
    itemsReturned: returned.count ?? 0,
  }
}

async function logAudit(action, entity, entityId, details) {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase
    .from('audit_log')
    .insert({ actor_id: user?.id ?? null, action, entity, entity_id: entityId, details })
}