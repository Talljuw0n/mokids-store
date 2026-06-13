export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  if (!src.includes('res.cloudinary.com')) return src
  const params = `f_auto,c_limit,w_${width},q_${quality ?? 'auto'}`
  return src.replace('/upload/', `/upload/${params}/`)
}
