'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import { Bell, CheckCircle2, Sparkles } from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'

import { playfair } from './serif'
import {
  habitsOn,
  isDoneOn,
  todayISO,
  useRutina,
  type Screen,
} from './store'

/* Topbar desktop — v3.1 Calm Editorial (adaptasi Figma Make, 100% sama):
   remah breadcrumb "Ruang personal / [Layar]" di kiri, motto
   "RUANG KECIL, PERUBAHAN BESAR." + lonceng pengingat + avatar di kanan.
   Hanya tampil lg+; ponsel tetap memakai kepala layar masing-masing.

   Lonceng membuka popover "Pengingat harian" berisi kebiasaan yang belum
   selesai hari ini (data nyata dari store) — pintu cepat ke Beranda.
   Avatar membuka layar Profil (pintu utama Profil di desktop, menggantikan
   item nav lama sesuai mock). */

const SCREEN_LABEL: Record<Screen, string> = {
  beranda: 'Beranda',
  bugar: 'Bugar',
  keuangan: 'Keuangan',
  kebiasaan: 'Kebiasaan',
  statistik: 'Statistik',
  jurnal: 'Jurnal',
  profil: 'Profil',
}

export function DesktopTopbar() {
  const screen = useRutina((s) => s.screen)
  const setScreen = useRutina((s) => s.setScreen)
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)

  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  /* Tutup popover lonceng saat ketuk di luar atau Escape. */
  useEffect(() => {
    if (!bellOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBellOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [bellOpen])

  const today = todayISO()
  const scheduledToday = useMemo(
    () => habitsOn(habits, today).filter((h) => !h.archived),
    [habits, today],
  )
  const pending = useMemo(
    () => scheduledToday.filter((h) => !isDoneOn(completions, today, h.id)),
    [scheduledToday, completions, today],
  )
  const allDone = scheduledToday.length > 0 && pending.length === 0

  return (
    <header className="hidden shrink-0 items-center justify-between gap-4 px-6 pt-5 lg:flex xl:px-8">
      {/* Remah breadcrumb — "Ruang personal / [Layar aktif]" */}
      <nav aria-label="Remah lokasi" className="flex min-w-0 items-center gap-2 text-meta">
        <span className="truncate font-medium text-content-muted">
          Ruang personal
        </span>
        <span aria-hidden="true" className="text-content-muted/60">
          /
        </span>
        <span className="truncate font-bold text-content-primary">
          {SCREEN_LABEL[screen]}
        </span>
      </nav>

      <div className="flex shrink-0 items-center gap-4">
        {/* Moto harian — uppercase tersebar, senyap. */}
        <p
          aria-hidden="true"
          className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-content-muted xl:block"
        >
          Ruang kecil, perubahan besar.
        </p>

        {/* Lonceng pengingat — popover kebiasaan belum selesai hari ini. */}
        <div ref={bellRef} className="relative">
          <button
            type="button"
            aria-label="Pengingat harian"
            aria-expanded={bellOpen}
            aria-haspopup="dialog"
            onClick={() => setBellOpen((v) => !v)}
            className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-surface-secondary/70 hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            {pending.length > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rust ring-2 ring-background"
              />
            )}
          </button>
          <AnimatePresence>
            {bellOpen && (
              <m.div
                role="dialog"
                aria-label="Pengingat harian"
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -4 }}
                transition={{ duration: motionTokens.duration.fast }}
                className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-border bg-surface-primary p-4 shadow-lift"
              >
                <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                  Pengingat harian
                </p>
                <p
                  className={`${playfair.className} mt-1 text-section-lg font-bold leading-snug text-content-primary`}
                >
                  {allDone
                    ? 'Hari ini sudah lengkap.'
                    : pending.length > 0
                      ? 'Satu per satu, selesaikan.'
                      : 'Belum ada jadwal hari ini.'}
                </p>
                {pending.length > 0 ? (
                  <>
                    <ul className="mt-3 flex max-h-44 flex-col gap-1.5 overflow-y-auto">
                      {pending.slice(0, 5).map((h) => (
                        <li
                          key={h.id}
                          className="flex items-center gap-2.5 rounded-xl bg-surface-sunken px-3 py-2 text-note font-medium text-content-primary"
                        >
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage-deep"
                          />
                          <span className="min-w-0 truncate">{h.title}</span>
                          {h.reminder && (
                            <span className="ml-auto shrink-0 text-eyebrow font-medium text-content-muted">
                              {h.reminder}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <m.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      transition={motionTokens.spring.snappy}
                      onClick={() => {
                        setBellOpen(false)
                        setScreen('beranda')
                      }}
                      className="interactive mt-3 flex h-9 w-full cursor-pointer items-center justify-center rounded-full bg-action-primary text-meta font-bold text-action-primary-fg hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      Buka daftar hari ini
                    </m.button>
                  </>
                ) : (
                  <p className="mt-2 flex items-center gap-2 text-note text-content-muted">
                    {allDone ? (
                      <>
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-success"
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                        Semua kebiasaan terjadwal selesai. Selamat beristirahat.
                      </>
                    ) : (
                      <>
                        <Sparkles
                          className="h-4 w-4 shrink-0 text-module-accent"
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                        Tanpa jadwal — hari yang tenang.
                      </>
                    )}
                  </p>
                )}
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar — pintu utama Profil di desktop (menggantikan nav lama). */}
        <m.button
          type="button"
          onClick={() => setScreen('profil')}
          aria-label="Buka profil"
          aria-current={screen === 'profil' ? 'page' : undefined}
          whileTap={{ scale: 0.92 }}
          transition={motionTokens.spring.snappy}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-tan text-body font-bold text-forest-ink shadow-soft transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          T
        </m.button>
      </div>
    </header>
  )
}
