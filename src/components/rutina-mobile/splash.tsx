'use client'

import { useCallback, useEffect, useRef } from 'react'
import * as m from 'motion/react-m'
import { createScope, createTimeline, stagger } from 'animejs'

import { motionTokens } from '@/lib/motion/tokens'
/**
 * Layar pembuka — marka “r tunas” digambar garis demi garis (anime.js
 * timeline): goresan huruf r ditarik dari pangkal batang melewati bahu,
 * lalu daun melayang digaris tepi, dan wordmark & tagline muncul bertahap.
 * Bisa diketuk untuk melewati.
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

  /* `finish` dibaca lewat ref di dalam effect — timeline pembuka HANYA
     boleh berjalan sekali. Jika `finish` masuk deps, perubahan identitas
     callback (re-render parent) me-restart seluruh animasi dari nol. */
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  })

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

    const timer = setTimeout(
      () => finishRef.current(),
      matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 2600,
    )
    return () => {
      clearTimeout(timer)
      /* revert() pada unmount akhir — aman: AnimatePresence telah
         menyelesaikan animasi keluar sebelum cleanup dijalankan. */
      scope.revert()
    }
    // Timeline sekali jalan saat mount (deps []); finish diakses via ref
    // agar re-render parent tidak me-restart animasi pembuka.
  }, [])

  return (
    <m.div
      key="splash"
      ref={rootRef}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.45, ease: motionTokens.easing.standard }}
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
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Marka v2.15 “r tunas” — geometri sama dengan scripts/gen-icons.ts:
            goresan r (stroke 9) + daun melayang (outline), centering seragam. */}
        <g transform="translate(-14.6 1.8)" strokeWidth="9">
          <path d="M58 124 V72 A32 32 0 0 1 90 40" />
          <path d="M88 32 Q96.8 7.9 117.3 11.9 Q115.2 36.3 102 32 Z" />
        </g>
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
