import { supabase, unwrap } from '../supabase'

const VIEWS = {
  month: 'leaderboard_monthly',
  semester: 'leaderboard_semester',
  all: 'leaderboard_all_time',
}

/**
 * @param {'month'|'semester'|'all'} period
 */
export async function getLeaderboard(period = 'semester', limit = 50) {
  const view = VIEWS[period] || VIEWS.semester
  return unwrap(
    await supabase
      .from(view)
      .select('id, full_name, avatar_url, course, department, points, items_surrendered, rank')
      .order('rank')
      .limit(limit)
  )
}

/**
 * The signed-in student's own standing, for the "you are ranked #N" strip.
 * Returned separately so it still shows when they are outside the top 50.
 */
export async function getMyStanding(period = 'semester') {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const view = VIEWS[period] || VIEWS.semester
  const { data } = await supabase
    .from(view)
    .select('id, full_name, points, items_surrendered, rank')
    .eq('id', user.id)
    .maybeSingle()

  return data ?? { id: user.id, points: 0, items_surrendered: 0, rank: null }
}

/** Point-by-point history for the profile page. */
export async function getMyPointsHistory(limit = 30) {
  return unwrap(
    await supabase
      .from('points_ledger')
      .select(`
        id, points, reason, note, created_at,
        item:items ( id, title )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
  )
}

/** Human labels for the points_reason enum. */
export const POINTS_REASON_LABEL = {
  item_surrendered: 'Surrendered a found item',
  item_returned: 'Item reunited with its owner',
  first_report: 'First report filed',
  admin_adjustment: 'Adjustment by admin',
  false_report_penalty: 'Penalty for a false report',
}