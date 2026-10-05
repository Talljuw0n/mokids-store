import { createClient, SupabaseClient } from '@supabase/supabase-js'

export function isConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

// Use this in server components / API routes that need service role
export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Named export for convenience in server components
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return Reflect.get(getSupabaseClient(), prop, getSupabaseClient())
  },
})

// Whether the shared sale campaign is still running — used by every page
// that renders ProductCard, so a product's on_sale flag stops showing a
// badge/struck price once the campaign's end date has passed. Defaults to
// true (campaign active) if the sale_settings table isn't reachable —
// harmless, since isOnSale() still requires a product's own on_sale flag
// and sale_price to be set before anything displays as on sale.
export async function getSaleCampaignActive(): Promise<boolean> {
  try {
    const sb = getServiceClient()
    const { data } = await sb.from('sale_settings').select('ends_at').eq('id', 1).maybeSingle()
    if (!data) return true
    return !data.ends_at || new Date(data.ends_at) > new Date()
  } catch {
    return true
  }
}
