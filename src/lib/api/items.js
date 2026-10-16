import { supabase, unwrap, BUCKETS, publicUrl } from '../supabase'

/**
 * Columns pulled for any item view. Joining the lookups here means the
 * UI never has to hold a category map in memory.
 */
const ITEM_SELECT = `
  id, type, title, description, status, occurred_on, occurred_time,
  location_detail, pin_latitude, pin_longitude,
  ai_description, ai_attributes, created_at,
  category:categories ( id, name, slug, icon ),
  location:campus_locations ( id, name, building ),
  reporter:profiles!items_reporter_id_fkey ( id, full_name, avatar_url, course ),
  images:item_images ( id, storage_path, is_primary )
`

/** Attach ready-to-render photo URLs so components never touch storage. */
function withPhotos(item) {
  if (!item) return item
  const images = (item.images || []).map((img) => ({
    ...img,
    url: publicUrl(BUCKETS.items, img.storage_path),
  }))
  const primary = images.find((i) => i.is_primary) || images[0] || null
  return { ...item, images, primaryPhoto: primary?.url ?? null }
}

/* ------------------------------------------------------------------ */
/* Reading                                                            */
/* ------------------------------------------------------------------ */

/**
 * The browse feed. Every filter is optional; RLS already hides anything
 * this user should not see, so there is no visibility logic here.
 *
 * @param {'lost'|'found'} [opts.type]
 * @param {string}   [opts.search]     matches title and description
 * @param {string}   [opts.dateFrom]   'YYYY-MM-DD'
 * @param {number}   [opts.page]       zero-based
 */
export async function listItems(opts = {}) {
  const {
    type,
    categoryId,
    locationId,
    status = 'active',
    search,
    dateFrom,
    dateTo,
    page = 0,
    pageSize = 12,
  } = opts

  let q = supabase
    .from('items')
    .select(ITEM_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (type) q = q.eq('type', type)
  if (status) q = q.eq('status', status)
  if (categoryId) q = q.eq('category_id', categoryId)
  if (locationId) q = q.eq('location_id', locationId)
  if (dateFrom) q = q.gte('occurred_on', dateFrom)
  if (dateTo) q = q.lte('occurred_on', dateTo)
  if (search?.trim()) {
    const term = `%${search.trim()}%`
    q = q.or(`title.ilike.${term},description.ilike.${term}`)
  }

  const { data, error, count } = await q
  if (error) throw new Error(error.message)
  return { items: (data || []).map(withPhotos), total: count ?? 0 }
}

export async function getItem(id) {
  const data = unwrap(
    await supabase.from('items').select(ITEM_SELECT).eq('id', id).single()
  )
  return withPhotos(data)
}

/** Everything the signed-in student has reported, for My Reports. */
export async function listMyItems(type) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  let q = supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('reporter_id', user.id)
    .order('created_at', { ascending: false })

  if (type) q = q.eq('type', type)
  return (unwrap(await q) || []).map(withPhotos)
}

/* ------------------------------------------------------------------ */
/* Writing                                                            */
/* ------------------------------------------------------------------ */

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

async function uploadPhotos(itemId, files) {
  const uploaded = []

  for (const [index, file] of files.entries()) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`${file.name} is not a supported image format.`)
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error(`${file.name} is larger than 5 MB.`)
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${itemId}/${Date.now()}-${index}.${ext}`

    const { error: upErr } = await supabase.storage
      .from(BUCKETS.items)
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

    uploaded.push({ item_id: itemId, storage_path: path, is_primary: index === 0 })
  }

  if (uploaded.length) {
    // FIX: Table name updated from 'item-images' to 'item_images'
   const { error } = await supabase.from('item_images').insert(uploaded)
    if (error) throw new Error(error.message)
  }
  return uploaded
}

/**
 * Create a lost or found report, then upload its photos.
 *
 * If photo upload fails the item row is deleted, so a half-created
 * report never appears in the feed with no picture for the AI to read.
 */
export async function createItem(fields, files = []) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  const item = unwrap(
    await supabase
      .from('items')
      .insert({
        type: fields.type,
        reporter_id: user.id,
        title: fields.title?.trim(),
        description: fields.description?.trim() || null,
        category_id: fields.categoryId,
        location_id: fields.locationId || null,
        location_detail: fields.locationDetail?.trim() || null,
        pin_latitude: fields.pinLatitude ?? null,
        pin_longitude: fields.pinLongitude ?? null,
        occurred_on: fields.occurredOn,
        occurred_time: fields.occurredTime || null,
        contact_via_email: fields.contactViaEmail ?? true,
        contact_number: fields.contactNumber?.trim() || null,
      })
      .select('id')
      .single()
  )

  try {
    if (files.length) await uploadPhotos(item.id, files)
  } catch (err) {
    await supabase.from('items').delete().eq('id', item.id)
    throw err
  }

  // Kick off Gemini analysis. Built in step 5 — until then this is a no-op
  // and the report simply has no embedding yet.
  supabase.functions
    .invoke('analyze-item', { body: { itemId: item.id } })
    .catch(() => {})

  return item.id
}

export async function updateItem(id, fields) {
  return unwrap(
    await supabase.from('items').update(fields).eq('id', id).select('id').single()
  )
}

/** Students cancel rather than delete, so the report keeps its history. */
export async function cancelItem(id) {
  return unwrap(
    await supabase.from('items').update({ status: 'expired' }).eq('id', id).select('id').single()
  )
}

/* ------------------------------------------------------------------ */
/* Lookups — cached in module scope; these change maybe twice a year    */
/* ------------------------------------------------------------------ */

let categoriesCache = null
let locationsCache = null

export async function getCategories() {
  if (categoriesCache) return categoriesCache
  categoriesCache = unwrap(
    await supabase
      .from('categories')
      .select('id, name, slug, icon')
      .eq('is_active', true)
      .order('sort_order')
  )
  return categoriesCache
}

export async function getLocations() {
  if (locationsCache) return locationsCache
  locationsCache = unwrap(
    await supabase
      .from('campus_locations')
      .select('id, name, building, latitude, longitude')
      .eq('is_active', true)
      .order('sort_order')
  )
  return locationsCache
}