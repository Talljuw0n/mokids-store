import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, isConfigured } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  if (!isConfigured()) return NextResponse.json(null, { status: 503 })

  const { sku } = await params
  const sb = getServiceClient()

  let { data: product } = await sb
    .from('products')
    .select('*, inventory(*)')
    .ilike('sku', sku)
    .single()

  if (!product) return NextResponse.json(null, { status: 404 })

  const { data: related } = await sb
    .from('products')
    .select('*, inventory(*)')
    .eq('category', product.category)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(4)

  return NextResponse.json({ product, related: related || [] })
}
