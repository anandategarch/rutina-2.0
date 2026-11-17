'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { animate } from 'animejs'
import { ArrowUpRight, Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { goToStyle } from './bits'

const MARQUEE = [
  'DISIPLIN',
  'KONSISTEN',
  'FOKUS',
  'STREAK',
  'RITME',
  'PROGRES',
  'REFLEKSI',
  'TENANG',
]

/** Kata yang dipecah per huruf — tiap huruf melompat saat di-hover (anime.js elastic). */
function Letters({ word, className }: { word: string; className: string }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([])
  return (
    <span className="inline-flex flex-wrap">
      {word.split('').map((ch, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          onMouseEnter={() => {
            const el = refs.current[i]
            if (el) {
              animate(el, {
                y: [0, -16, 0],
                rotate: [0, -7, 0],
                duration: 540,
                ease: 'outElastic(1, .55)',
              })
            }
          }}
          className={`inline-block cursor-default select-none ${className}`}
        >
          {ch}
        </span>
      ))}
    </span>
  )
}

function Reveal({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <span className="-mb-[0.06em] block overflow-hidden pb-[0.06em]">
      <motion.span
        className="block"
        initial={{ y: '112%' }}
        animate={{ y: '0%' }}
        transition={{ delay, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.span>
    </span>
  )
}

export default function TypographyDriven() {
  const [dark, setDark] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // Marquee berjalan tanpa henti (anime.js loop linear)
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const w = track.scrollWidth / 2
    const anim = animate(track, { x: [0, -w], duration: 26000, loop: true, ease: 'linear' })
    return () => anim.revert()
  }, [])

  const t = dark
    ? {
        bg: 'bg-[#231F1E]',
        text: 'text-[#F5F3EE]',
        sub: 'text-[#A99C90]',
        mono: 'text-[#A99C90]',
        line: 'border-[#F5F3EE]/12',
        accent: 'text-[#A3C48E]',
        link: 'decoration-[#A3C48E]',
        stroke: '[-webkit-text-stroke:1px_rgba(245,243,238,0.10)]',
      }
    : {
        bg: 'bg-[#F5F3EE]',
        text: 'text-[#231F1E]',
        sub: 'text-[#8A7D72]',
        mono: 'text-[#A99C90]',
        line: 'border-[#231F1E]/10',
        accent: 'text-[#5E7F47]',
        link: 'decoration-[#749B58]',
        stroke: '[-webkit-text-stroke:1px_rgba(35,31,30,0.08)]',
      }

  return (
    <section
      className={`flex min-h-screen flex-col overflow-hidden transition-colors duration-500 ${t.bg} ${t.text}`}
    >
      {/* Bar atas */}
      <div
        className={`flex items-center justify-between gap-4 border-b px-5 pb-4 pt-20 sm:px-8 sm:pt-14 ${t.line}`}
      >
        <span
          className={`font-mono text-[10px] font-medium uppercase tracking-[0.28em] ${t.mono}`}
        >
          Rutina — 2025
        </span>
        <div className="flex items-center gap-2">
          {dark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          <Switch checked={dark} onCheckedChange={setDark} aria-label="Mode malam" />
        </div>
      </div>

      {/* Tengah */}
      <div className="relative flex flex-1 flex-col justify-center px-5 py-16 sm:px-8">
        <span
          aria-hidden
          className={`pointer-events-none absolute -right-8 bottom-0 select-none text-[46vw] font-semibold leading-none text-transparent opacity-50 sm:text-[30vw] sm:opacity-100 ${t.stroke}`}
        >
          66
        </span>

        <h1 className="relative z-10 text-[clamp(2.7rem,11vw,9.5rem)] font-semibold leading-[0.95] tracking-[-0.035em]">
          <Reveal delay={0.05}>Bangun</Reveal>
          <motion.span
            initial={{ opacity: 0, y: 42 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="block"
          >
            <Letters word="kebiasaan" className={t.accent} />{' '}
            <span className="font-serif font-normal italic">yang</span>
          </motion.span>
          <Reveal delay={0.3}>menempel.</Reveal>
        </h1>

        <div className="relative z-10 mt-10 flex flex-col gap-6 sm:mt-14 sm:flex-row sm:items-end sm:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className={`max-w-sm text-sm leading-relaxed ${t.sub}`}
          >
            Tanpa notifikasi berisik. Tanpa gamifikasi culun. Cuma kamu, kebiasaan kecil,
            dan streak yang tumbuh pelan-pelan setiap hari.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                goToStyle(2)
              }}
              className={`group inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-2 underline-offset-8 ${t.text} ${t.link}`}
            >
              Mulai gratis{' '}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            <span
              className={`font-mono text-[10px] font-medium uppercase tracking-[0.22em] ${t.mono}`}
            >
              66 hari → otomatis
            </span>
          </motion.div>
        </div>
      </div>

      {/* Statistik */}
      <div className={`grid grid-cols-3 border-t ${t.line}`}>
        {[
          { v: '128rb', l: 'pengguna aktif' },
          { v: '4.9/5', l: 'rating toko aplikasi' },
          { v: '66', l: 'hari rata-rata menempel' },
        ].map((s, i) => (
          <div key={s.l} className={`px-5 py-4 sm:px-8 ${i > 0 ? `border-l ${t.line}` : ''}`}>
            <p className="text-lg font-semibold tabular-nums tracking-tight sm:text-2xl">
              {s.v}
            </p>
            <p className={`mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.2em] ${t.mono}`}>
              {s.l}
            </p>
          </div>
        ))}
      </div>

      {/* Marquee */}
      <div className={`overflow-hidden border-t py-4 ${t.line}`}>
        <div ref={trackRef} className="flex w-max items-center will-change-transform">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex items-center">
              {MARQUEE.map((m) => (
                <span
                  key={m}
                  className={`flex items-center font-mono text-[11px] font-medium uppercase tracking-[0.32em] ${t.mono}`}
                >
                  <span className="px-7">{m}</span>
                  <span className={t.accent}>✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
