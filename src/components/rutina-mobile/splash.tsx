'use client'

import { useCallback, useEffect, useRef } from 'react'
import * as m from 'motion/react-m'
import { createScope, createTimeline, stagger } from 'animejs'

/**
 * Layar pembuka — logo tunas digambar garis demi garis (anime.js timeline),
 * lalu wordmark & tagline muncul bertahap. Bisa diketuk untuk melewati.
 *
 * Lifecycle: seluruh timeline hidup dalam anime `createScope` — saat
 * komponen unmount (termasuk saat dilewati lebih awal) scope.revert()
 * menghentikan & membersihkan setiap instance agar tidak ada animation
 * tick pada node yang sudah terlepas. Media query reduced-motion membuat
 * seluruh durasi nol: konten langsung tampil, timer selesai lebih cepat.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const tagRef = useRef<HTMLParagraphElement>(null)
  const doneRef = useRef(false)

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, [onDone])

  useEffect(() => {
    const svg = svgRef.current
    const title = titleRef.current
    if (!svg || !title || !rootRef.current) return

    // Siapkan garis: hitung panjang total tiap path/circle lalu sembunyikan
    const strokes = svg.querySelectorAll('path, circle')
    strokes.forEach((el) => {
      const geom = el as SVGGeometryElement
      const len = geom.getTotalLength()
      const styled = el as SVGElement
      styled.style.strokeDasharray = `${len}`
      styled.style.strokeDashoffset = `${len}`
    })

    /* Scope anime.js: selector dibatasi dalam root, revert() otomatis saat
       unmount, dan mediaQueries menghormati prefers-reduced-motion. */
    const scope = createScope({
      root: rootRef,
      mediaQueries: {
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
    }).add((self) => {
      const rm = self?.matches?.reduceMotion ?? false
      const dur = (ms: number) => (rm ? 1 : ms)

      const tl = createTimeline({ defaults: { ease: 'outExpo' } })
      tl.add(svg, { opacity: [0, 1], duration: dur(300) }, 0)
      tl.add(
        strokes,
        {
          strokeDashoffset: 0,
          duration: dur(850),
          delay: rm ? 0 : stagger(90),
        },
        rm ? 0 : 150,
      )
      tl.add(
        title.querySelectorAll('[data-char]'),
        {
          translateY: [28, 0],
          opacity: [0, 1],
          duration: dur(650),
          delay: rm ? 0 : stagger(45),
        },
        rm ? 0 : 550,
      )
      if (tagRef.current) {
        tl.add(
          tagRef.current,
          { opacity: [0, 1], translateY: [10, 0], duration: dur(550) },
          rm ? 0 : 1150,
        )
      }
    })

    const timer = setTimeout(finish, matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 2600)
    return () => {
      clearTimeout(timer)
      /* revert() pada unmount akhir — aman: AnimatePresence telah
         menyelesaikan animasi keluar sebelum cleanup dijalankan. */
      scope.revert()
    }
  }, [finish])

  return (
    <m.div
      key="splash"
      ref={rootRef}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onClick={finish}
      role="button"
      aria-label="Lewati layar pembuka"
      className="absolute inset-0 z-[70] flex cursor-pointer select-none flex-col items-center justify-center bg-primary text-primary-foreground"
    >
      <svg
        ref={svgRef}
        style={{ opacity: 0 }}
        viewBox="0 0 140 140"
        className="h-28 w-28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="98" cy="34" r="12" />
        <path d="M98 14v5M98 49v5M78 34h5M113 34h5" />
        <path d="M4 106q34-36 68 0" />
        <path d="M52 120q30-28 60 0" />
        <path d="M26 122v-10" />
        <path d="M26 112c-8-1-12-6-12-13 8 1 12 6 12 13z" />
        <path d="M26 112c8-1 12-6 12-13-8 1-12 6-12 13z" />
      </svg>

      <h1
        ref={titleRef}
        className="mt-7 text-[34px] font-bold tracking-tight"
        aria-label="rutina"
      >
        {'rutina.'.split('').map((c, i) => (
          <span
            key={i}
            data-char
            style={{ opacity: 0 }}
            className="inline-block"
          >
            {c}
          </span>
        ))}
      </h1>

      <p
        ref={tagRef}
        style={{ opacity: 0 }}
        className="mt-2 text-[13px] font-medium text-primary-foreground/80"
      >
        Kebiasaan kecil, perubahan besar.
      </p>

      <p className="absolute bottom-8 text-[9px] font-bold uppercase tracking-[0.28em] text-primary-foreground/50">
        Earth Tone Edition
      </p>
    </m.div>
  )
}
