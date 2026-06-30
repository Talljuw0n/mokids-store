'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Product } from '@/types'
import { formatPrice, productSlug } from '@/lib/utils'

interface HeroSlide {
  product: Product
  heroImage: string
}

interface Props {
  slides: HeroSlide[]
}

export function BackToSchoolSlideshow({ slides }: Props) {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  const goTo = useCallback((index: number) => {
    setVisible(false)
    setTimeout(() => {
      setCurrent(index)
      setVisible(true)
    }, 240)
  }, [])

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo, slides.length])
  const prev = () => goTo((current - 1 + slides.length) % slides.length)

  useEffect(() => {
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next])

  if (!slides.length) return null

  const { product, heroImage } = slides[current]
  const slug = `${productSlug(product.sku, product.name)}?g=${product.gender}`
  const collectionLabel = product.gender === 'boys' ? 'BOYS COLLECTION' : 'GIRLS COLLECTION'

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#03031A', minHeight: '680px' }}
    >
      {/* Full-bleed hero image on the right */}
      <div
        className="absolute inset-y-0 right-0 w-full md:w-[58%]"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.24s ease' }}
      >
        <Image
          src={heroImage}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 58vw"
          className="object-cover object-center"
          priority
        />
      </div>

      {/* Gradient: solid navy left → transparent right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #03031A 0%, #03031A 36%, rgba(3,3,26,0.55) 50%, rgba(3,3,26,0) 66%)' }}
      />
      {/* Extra mobile darkening */}
      <div
        className="absolute inset-0 pointer-events-none md:hidden"
        style={{ background: 'rgba(3,3,26,0.55)' }}
      />

      <div
        className="relative max-w-7xl mx-auto flex items-center"
        style={{ minHeight: '680px', zIndex: 2 }}
      >
        {/* Left text panel */}
        <div
          className="flex-1 flex flex-col justify-center px-8 md:px-14 py-12 md:py-16 text-center md:text-left"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.24s ease', maxWidth: '520px' }}
        >
          {/* Script label */}
          <p style={{
            fontFamily: "'Satisfy', cursive",
            color: '#F5C000',
            fontSize: '1.7rem',
            marginBottom: '0.75rem',
            lineHeight: 1.2,
          }}>
            Back to School 2026
          </p>

          {/* Product name */}
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            color: '#ffffff',
            fontSize: 'clamp(1.9rem, 3.2vw, 3.1rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: '0.6rem',
          }}>
            {product.name}
          </h2>

          {/* Collection label */}
          <p style={{
            fontFamily: "'Poppins', sans-serif",
            color: '#7eb8f7',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}>
            {collectionLabel}
          </p>

          {/* Price */}
          {product.price > 0 && (
            <p style={{
              fontFamily: "'Poppins', sans-serif",
              color: '#F5C000',
              fontSize: '2.2rem',
              fontWeight: 800,
              marginBottom: '1.75rem',
            }}>
              {formatPrice(product.price)}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
            <Link
              href={`/shop/${slug}`}
              className="px-7 py-3 rounded-full font-bold transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{ background: '#D9247A', color: '#ffffff', fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem' }}
            >
              Shop Now
            </Link>
            <Link
              href={`/shop?category=${product.category}`}
              className="font-bold transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem' }}
            >
              View Collection ›
            </Link>
          </div>
        </div>
      </div>

      {/* Dot navigation */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 10 }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-300"
            style={{
              height: '8px',
              width: i === current ? '28px' : '8px',
              background: i === current ? '#F5C000' : 'rgba(255,255,255,0.3)',
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold transition-all hover:scale-110"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', zIndex: 10 }}
        aria-label="Previous"
      >‹</button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold transition-all hover:scale-110"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', zIndex: 10 }}
        aria-label="Next"
      >›</button>
    </section>
  )
}
