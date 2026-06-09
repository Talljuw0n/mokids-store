import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const { product_id, size, quantity } = await req.json()

  if (!product_id || !size || quantity === undefined) {
    return NextResponse.json({ error: 'product_id, size, and quantity are required' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('inventory')
    .upsert({ product_id, size, quantity }, { onConflict: 'product_id,size' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
