'use client'

import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { useFirstVisit } from '@/lib/motion/first-visit'
import { useSmoothScroller } from './smooth-scroll-area'

gsap.registerPlugin(ScrollTrigger)

/**
 * WordReveal — judul muncul PER KATA saat digulir (GSAP + ScrollTrigger,
 * fondasi animasi v2.87).
 *
 * Perilaku:
 *   • Tiap kata dibungkus mask overflow-hidden; kata meluncur naik dari
 *     bawah garis (yPercent 130 → 0) beruntun — karakter khas gsap.com,
 *     bekerja sama di ponsel (gulir sentuh native) maupun desktop.
 *   • ScrollTrigger menunggu elemen masuk viewport (start 'top 88%'),
 *     sekali jalan (once) — judul di lipatan bawah terungkap tepat saat
 *     digulir ke sana, judul di puncak layar bermain saat layar mount.
 *   • Gerbang anti-replay useFirstVisit (kunjungi ulang tab → instan)
 *     dan prefers-reduced-motion (langsung statis) — konsisten dengan
 *     governance BlurFade/motion-kit.
 *   • `hold` — tahan kata tetap tersembunyi sampai sinyal luar (dipakai
 *     judul Beranda: menunggu splash memudar, lihat shell-reveal.ts).
 *
 * Tipografi: mask diberi bantalan bawah 0,12em (margin negatif penyeimbang)
 * agar descender (g, y, p) tidak terpotong — aman untuk leading-none.
 * Spasi hidup sebagai NBSP di dalam mask: kata membawa spasinya sendiri
 * saat meluncur, baris tetap seimbang (text-wrap: balance tetap bekerja).
 *
 * Di luar SmoothScrollArea (tanpa wadah gulir halus) tween bermain saat
 * mount tanpa ScrollTrigger — tidak pernah menggantung tersembunyi.
 */
export interface WordRevealProps {
  /** Teks judul — dipecah per kata. */
  text: string
  /** Elemen heading (default 'h1'). */
  as?: ElementType
  className?: string
  /** Gerbang anti-replay — konvensi '<layar>-<blok>'. */
  visitKey?: string
  /** Jeda antar kata (detik). */
  stagger?: number
  /** Titik mulai ScrollTrigger (default 'top 88%'). */
  start?: string
  /** Tahan tersembunyi sampai false (mis. menunggu splash). */
  hold?: boolean
  /** Simpul aksen setelah kata terakhir (mis. titik warna domain). */
  suffix?: ReactNode
}

export function WordReveal({
  text,
  as: Tag = 'h1',
  className,
  visitKey,
  stagger = 0.055,
  start = 'top 88%',
  hold = false,
  suffix,
}: WordRevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const scroller = useSmoothScroller()
  const firstVisit = useFirstVisit(visitKey)
  const words = text.split(' ')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !text) return

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    /* Kunjungan ulang / reduced-motion: langsung keadaan akhir —
       seluruh kata terlihat instan, tanpa gerak. */
    if (reduced || !firstVisit) return

    /* Ditahan (di balik splash): sembunyikan kata, jangan pasang
       pemicu — sinyal hold akan memicu effect ulang saat lepas. */
    if (hold) {
      gsap.set(el.querySelectorAll('[data-word]'), {
        yPercent: 130,
        opacity: 0,
      })
      return
    }

    const wrapperEl = scroller?.wrapperRef.current ?? null

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-word]',
        { yPercent: 130, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power3.out',
          stagger,
          scrollTrigger: wrapperEl
            ? {
                trigger: el,
                scroller: wrapperEl,
                start,
                once: true,
              }
            : undefined,
        },
      )
    }, el)

    return () => ctx.revert()
  }, [text, firstVisit, hold, stagger, start, scroller])

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-top"
        >
          <span data-word className="inline-block will-change-transform">
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </span>
        </span>
      ))}
      {suffix != null && <span aria-hidden="true">{suffix}</span>}
    </Tag>
  )
}
