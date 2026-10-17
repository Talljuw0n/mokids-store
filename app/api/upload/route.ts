import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { isAdminRequest, unauthorized } from '@/lib/auth'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const formData = await req.formData()
  const file = formData.get('file') as File
  const folder = (formData.get('folder') as string) || 'mokids'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files can be uploaded' }, { status: 400 })
  }
  // Keep uploads inside the store's own Cloudinary folder (e.g. mokids/MokidsD001)
  if (!/^mokids(\/[A-Za-z0-9_-]+)*$/.test(folder)) {
    return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 })
  }

  const MAX_BYTES = 10 * 1024 * 1024
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — max 10MB` }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
        (err, result) => {
          if (err) reject(err)
          else resolve(result as { secure_url: string; public_id: string })
        }
      ).end(buffer)
    })
    return NextResponse.json({ url: result.secure_url, publicId: result.public_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload to Cloudinary failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
