import { NextResponse } from 'next/server'
import { getSaleCampaignActive } from '@/lib/supabase'

// Public — whether the sale campaign is still running, so client components
// (navbar/footer "Sale" links) can hide themselves once it ends
export async function GET() {
  const active = await getSaleCampaignActive()
  return NextResponse.json({ active }, { headers: { 'Cache-Control': 'no-store' } })
}
