import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, isConfigured } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  if (!isConfigured()) return NextResponse.json(null, { status: 503 })

  const { sku } = await params
  const gender = req.nextUrl.searchParams.get('g')
  const sb = getServiceClient()

  let query = sb.from('products').select('*, inventory(*)').ilike('sku', sku)
  if (gender) query = query.eq('gender', gender)

  const { data: rows } = await query
  const product = rows?.[0] ?? null
  if (!product) return NextResponse.json(null, { status: 404 })

  const { data: related } = await sb
    .from('products')
    .select('*, inventory(*)')
    .eq('category', product.category)
    .eq('is_active', true)
    .eq('is_variant_child', false)
    .neq('id', product.id)
    .limit(4)

  let variants = null
  if (product.variant_group) {
    const { data: siblings } = await sb
      .from('products')
      .select('id, sku, name, price, variant_label, colour, images, inventory(*)')
      .eq('variant_group', product.variant_group)
      .eq('gender', product.gender)
    variants = siblings && siblings.length > 1 ? siblings : null
  }

  return NextResponse.json({ product, related: related || [], variants })
}
