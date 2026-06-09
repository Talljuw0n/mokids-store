import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const sb = getServiceClient()

  const { data: inventory, error } = await sb
    .from('inventory')
    .select(`
      id,
      product_id,
      size,
      quantity,
      updated_at,
      products (
        name,
        sku,
        category
      )
    `)
    .order('quantity', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (inventory || []).map((inv: any) => ({
    id: inv.id,
    product_id: inv.product_id,
    size: inv.size,
    quantity: inv.quantity,
    updated_at: inv.updated_at,
    product_name: inv.products?.name || 'Unknown',
    product_sku: inv.products?.sku || '',
    product_category: inv.products?.category || '',
  }))

  return NextResponse.json(rows)
}
