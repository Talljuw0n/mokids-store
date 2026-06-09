'use client'
import Link from 'next/link'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'

export function LogoLink() {
  const router = useRouter()
  const clicks = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = (e: React.MouseEvent) => {
    clicks.current += 1

    if (timer.current) clearTimeout(timer.current)

    if (clicks.current >= 5) {
      e.preventDefault()
      clicks.current = 0
      router.push('/admin/login')
      return
    }

    // Reset counter after 800ms — normal link navigation proceeds
    timer.current = setTimeout(() => {
      clicks.current = 0
    }, 800)
  }

  return (
    <Link
      href="/"
      onClick={handleClick}
      className="flex-shrink-0 text-xl font-bold leading-none"
      style={{ fontFamily: "'Fredoka One', cursive" }}
    >
      <span className="text-black">Mo</span>
      <span className="text-[#D9247A]">Kids</span>
      <span className="text-[#F5C000]"> Place</span>
    </Link>
  )
}
