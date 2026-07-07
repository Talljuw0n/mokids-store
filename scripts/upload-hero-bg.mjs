import { readFileSync } from 'fs'
import { createHash } from 'crypto'
import path from 'path'

const ROOT = 'c:/Users/Superuser/mokids-store'

const envFile = readFileSync(path.join(ROOT, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const CLOUD_NAME = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const API_KEY = env.CLOUDINARY_API_KEY
const API_SECRET = env.CLOUDINARY_API_SECRET

const FILES = [
  { file: 'hero1.jpeg', public_id: 'mokids/hero/hero-bg-1' },
  { file: 'hero2.jpeg', public_id: 'mokids/hero/hero-bg-2' },
  { file: 'hero3.jpeg', public_id: 'mokids/hero/hero-bg-3' },
]

async function upload(file, public_id) {
  const data = readFileSync(path.join(ROOT, file))
  const b64 = data.toString('base64')
  const dataUri = `data:image/jpeg;base64,${b64}`

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const toSign = `overwrite=true&public_id=${public_id}&timestamp=${timestamp}${API_SECRET}`
  const signature = createHash('sha256').update(toSign).digest('hex')

  const params = new URLSearchParams({
    file: dataUri,
    public_id,
    timestamp,
    api_key: API_KEY,
    signature,
    overwrite: 'true',
  })

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: params,
  })
  const json = await res.json()
  if (json.secure_url) {
    console.log(`✓ ${public_id}\n  → ${json.secure_url}`)
  } else {
    console.error(`✗ ${public_id}:`, JSON.stringify(json))
  }
  return json.secure_url
}

for (const { file, public_id } of FILES) {
  await upload(file, public_id)
}
