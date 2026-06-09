import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const sb = getServiceClient()
  const { productId } = await params

  const { data, error } = await sb
    .from('inventory')
    .select('*')
    .eq('product_id', productId)
    .order('size')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
