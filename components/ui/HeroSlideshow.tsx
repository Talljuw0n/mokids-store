'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export interface HeroSlide {
  image: string
  alt?: string
  headline?: string[]
  subtitle?: string
  ctaHref?: string
  ctaLabel?: string
  imagePosition?: string
  // Desktop crops are tuned to sit beside the text gradient on a wide frame;
  // a portrait phone screen needs its own framing or the subject ends up
  // pushed out of view with mostly empty sky/background showing instead.
  mobileImagePosition?: string
}

const DEFAULT_HEADLINE = ['Dress Them', 'in Pure Joy']
const DEFAULT_SUBTITLE = "Premium children's clothing for Nigerian kids. Bold styles, vibrant colours and quality that lasts."

interface Props {
  slides: HeroSlide[]
}

export function HeroSlideshow({ slides }: Props) {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const touchStartX = useRef<number | null>(null)

  const goTo = useCallback((index: number) => {
    setVisible(false)
    setTimeout(() => {
      setCurrent(index)
      setVisible(true)
    }, 350)
  }, [])

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo, slides.length])
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo, slides.length])

  useEffect(() => {
    if (slides.length < 2) return
    const t = setInterval(next, 5500)
    return () => clearInterval(t)
  }, [next, slides.length])

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || slides.length < 2) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 40) (delta < 0 ? next() : prev())
    touchStartX.current = null
  }

  if (!slides?.length) return null
  const slide = slides[Math.min(current, slides.length - 1)]
  const lines = slide.headline ?? DEFAULT_HEADLINE
  const subtitle = slide.subtitle ?? DEFAULT_SUBTITLE

  return (
    <section
      className="relative w-full overflow-hidden h-[62vh] min-h-[460px] max-h-[620px] md:h-[88vh] md:min-h-[680px] md:max-h-[900px]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >

      {/* Background image — fades with slide */}
      <div
        className="absolute inset-0"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}
      >
        <Image
          src={slide.image}
          alt={slide.alt ?? 'Hero background'}
          fill
          className="object-cover hero-bg-image"
          style={{
            '--pos-mobile': slide.mobileImagePosition ?? 'center 65%',
            '--pos-desktop': slide.imagePosition ?? 'center',
          } as React.CSSProperties}
          sizes="100vw"
          priority
        />
      </div>

      {/* Dark gradient overlay — left side for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.1) 70%, transparent 100%)',
        }}
      />

      {/* Text content — fades with slide */}
      <div
        className="absolute inset-0 flex items-center"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}
      >
        <div className="max-w-7xl mx-auto w-full" style={{ paddingLeft: 'clamp(24px, 6vw, 100px)', paddingRight: 'clamp(24px, 6vw, 100px)' }}>
          <div className="max-w-lg">
            <h1
              style={{
                fontFamily: "'Fredoka', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(2.8rem, 4.5vw, 4.5rem)',
                lineHeight: 1.05,
                textTransform: 'uppercase',
                color: '#ffffff',
                marginBottom: '1.25rem',
                textShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              {lines.map((line, i) => (
                <span key={i} style={{ display: 'block' }}>{line}</span>
              ))}
            </h1>

            <p
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 500,
                fontSize: '1rem',
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.7,
                marginBottom: '2rem',
                maxWidth: '380px',
              }}
            >
              {subtitle}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href={slide.ctaHref ?? '/shop'}
                className="px-7 py-3 rounded-full font-bold transition-all hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center gap-2"
                style={{ background: '#D9247A', color: '#fff', fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem' }}
              >
                {slide.ctaLabel ?? 'Shop now'} <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Prev/next arrows — hidden on mobile, where they'd sit on top of the
          text; swipe + dots cover navigation there instead */}
      <button
        onClick={prev}
        className="hidden md:flex absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full items-center justify-center font-bold text-xl transition-all hover:scale-110"
        style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(4px)', border: '1.5px solid rgba(255,255,255,0.4)' }}
        aria-label="Previous"
      >‹</button>

      {/* Next arrow */}
      <button
        onClick={next}
        className="hidden md:flex absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full items-center justify-center font-bold text-xl transition-all hover:scale-110"
        style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(4px)', border: '1.5px solid rgba(255,255,255,0.4)' }}
        aria-label="Next"
      >›</button>

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                height: '8px',
                width: i === current ? '28px' : '8px',
                background: i === current ? '#D9247A' : 'rgba(255,255,255,0.6)',
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      <style jsx global>{`
        .hero-bg-image {
          object-position: var(--pos-mobile);
        }
        @media (min-width: 768px) {
          .hero-bg-image {
            object-position: var(--pos-desktop);
          }
        }
      `}</style>
    </section>
  )
}
