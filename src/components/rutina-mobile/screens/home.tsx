'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { motion } from 'motion/react'
import { animate, stagger } from 'animejs'
import {
  BookOpen,
  BookmarkPlus,
  Briefcase,
  Check,
  Flame,
  Heart,
  Lightbulb,
  Plus,
  Quote,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Counter } from '../counter'
import { playfair } from '../serif'
import { HeroDoodle } from '../hero-doodle'
import { useRutina, FOLDERS, QUOTE_TEXT, QUOTE_AUTHOR } from '../store'
import type { FolderKey } from '../store'

/* ===== Potongan kecil ===== */

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#4A3B32]">
        {title}
      </h2>
      {hint ? (
        <span className="text-xs font-medium text-[#4A3B32]/70">{hint}</span>
      ) : null}
    </div>
  )
}

const FOLDER_ICONS: Record<FolderKey, LucideIcon> = {
  kerja: Briefcase,
  ide: Lightbulb,
  bacaan: BookOpen,
  pribadi: Heart,
}

/* Tanggal & sapaan live — nilai khusus klien yang aman dari hydration:
   snapshot server kosong, snapshot klien terisi setelah mount
   (tanpa setState langsung di dalam effect). */
const emptySubscribe = () => () => {}

function getClientDateLabel(): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

function getClientGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 19) return 'Selamat sore'
  return 'Selamat malam'
}

/* ===== Layar Beranda ===== */

export default function HomeScreen() {
  const tasks = useRutina((s) => s.tasks)
  const toggleTask = useRutina((s) => s.toggleTask)
  const openFolder = useRutina((s) => s.openFolder)
  const openCompose = useRutina((s) => s.openCompose)
  const quoteSaved = useRutina((s) => s.quoteSaved)
  const saveQuote = useRutina((s) => s.saveQuote)

  const taskListRef = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)

  const dateLabel = useSyncExternalStore(
    emptySubscribe,
    getClientDateLabel,
    () => '',
  )
  const greeting = useSyncExternalStore(
    emptySubscribe,
    getClientGreeting,
    () => 'Selamat pagi',
  )

  // anime.js — orkestrasi masuk daftar tugas
  useEffect(() => {
    if (!taskListRef.current) return
    const anim = animate(taskListRef.current.querySelectorAll(':scope > div'), {
      translateY: [18, 0],
      opacity: [0, 1],
      delay: stagger(70),
      duration: 720,
      ease: 'outExpo',
    })
    return () => {
      anim.revert()
    }
  }, [])

  const doneCount = tasks.filter((t) => t.done).length
  const pct =
    tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  // Toast saat semua tugas selesai — hanya sekali
  useEffect(() => {
    if (tasks.length > 0 && tasks.every((t) => t.done) && !firedRef.current) {
      firedRef.current = true
      toast.success('Semua tugas selesai — hari yang produktif!')
    }
  }, [tasks])

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-5">
      {/* Header aplikasi */}
      <header className="mb-5 flex items-center justify-between">
        <p className="text-[19px] font-bold tracking-tight text-[#231F1E]">
          rutina<span className="text-[#749B58]">.</span>
        </p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4A3B32] text-[11px] font-bold tracking-widest text-[#FAF9F6]">
          AN
        </span>
      </header>

      {/* 1 — Kartu Ringkasan Utama (Daily Focus & Hero Summary) */}
      <motion.section
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Ringkasan harian"
        className="relative overflow-hidden rounded-[24px] bg-[#749B58] p-6 pb-7 text-[#FAF9F6]"
      >
        <HeroDoodle />
        <div className="relative z-10">
          <p className="text-[13px] font-medium text-[#FAF9F6]/75">
            {dateLabel}
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight">
            {greeting}, Ananda
          </h1>

          <div className="mt-6">
            <p className="text-[12px] font-medium text-[#FAF9F6]/75">
              Tugas selesai
            </p>
            <p className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-[56px] font-semibold leading-none tracking-tight">
                <Counter to={pct} />
              </span>
              <span className="text-lg font-medium text-[#FAF9F6]/80">%</span>
            </p>
            <p className="mt-1.5 text-xs font-medium text-[#FAF9F6]/70">
              {doneCount} dari {tasks.length} tugas •{' '}
              {tasks.length - doneCount} tersisa
            </p>
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#FAF9F6]/25">
            <motion.div
              initial={false}
              className="h-full rounded-full bg-[#FAF9F6]"
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 130, damping: 22 }}
            />
          </div>

          <Button
            type="button"
            onClick={() => openCompose()}
            className="mt-5 h-11 w-full rounded-full bg-[#FAF9F6] text-[15px] font-semibold text-[#231F1E] shadow-[0_8px_20px_rgba(35,31,30,0.16)] hover:bg-white hover:shadow-[0_10px_26px_rgba(35,31,30,0.22)]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Catatan Baru
          </Button>
        </div>
      </motion.section>

      {/* 2 — Daftar Tugas & Kebiasaan */}
      <section className="mt-8" aria-label="Daftar tugas harian">
        <SectionTitle
          title="Fokus Hari Ini"
          hint={`${doneCount}/${tasks.length} selesai`}
        />
        <div ref={taskListRef} className="space-y-2.5">
          {tasks.map((t) => (
            <motion.div
              key={t.id}
              role="checkbox"
              aria-checked={t.done}
              aria-label={`Tandai selesai: ${t.title}`}
              tabIndex={0}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleTask(t.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleTask(t.id)
                }
              }}
              className={`flex cursor-pointer items-center gap-3 rounded-[16px] border p-3.5 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ${
                t.done
                  ? 'border-[#749B5833] bg-[#E4EFE0]'
                  : 'border-[#4A3B321F] bg-white'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                  t.done
                    ? 'border-[#749B58] bg-[#749B58] text-white'
                    : 'border-[#4A3B3240] text-transparent'
                }`}
              >
                <motion.span
                  key={String(t.done)}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  className="flex"
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </motion.span>
              </span>

              <span
                className={
                  'min-w-0 flex-1 truncate text-left text-[15px] font-medium transition-colors duration-300 ' +
                  (t.done
                    ? 'text-[#231F1E]/45 line-through decoration-[#231F1E]/30'
                    : 'text-[#231F1E]')
                }
              >
                {t.title}
              </span>

              {t.streak ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#EAE5D9] px-2.5 py-1 text-[11px] font-bold text-[#4A3B32]">
                  <Flame className="h-3.5 w-3.5" />
                  {t.streak} hari
                </span>
              ) : t.cat ? (
                <span className="shrink-0 rounded-full bg-[#E4EFE0] px-2.5 py-1 text-[11px] font-bold text-[#4A3B32]">
                  {t.cat}
                </span>
              ) : null}
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3 — Kartu Kategori / Folder */}
      <section className="mt-8" aria-label="Koleksi folder catatan">
        <SectionTitle title="Koleksi" hint="4 folder" />
        <div className="grid grid-cols-2 gap-3">
          {FOLDERS.map((f, i) => {
            const Icon = FOLDER_ICONS[f.key]
            return (
              <motion.div
                key={f.key}
                role="button"
                tabIndex={0}
                aria-label={`Buka folder ${f.label}, ${f.count} catatan`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openFolder(f.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openFolder(f.key)
                  }
                }}
                className="flex aspect-square cursor-pointer flex-col justify-between rounded-[20px] bg-[#E4EFE0] p-4 transition-shadow duration-300 hover:shadow-[0_10px_24px_rgba(74,59,50,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#4A3B32]">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                  <button
                    type="button"
                    aria-label={`Buat catatan baru di folder ${f.label}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      openCompose(f.key)
                    }}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/70 text-[#4A3B32] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
                <span>
                  <span className="block text-[15px] font-semibold leading-tight text-[#231F1E]">
                    {f.label}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-[#4A3B32]/70">
                    {f.count} Catatan
                  </span>
                </span>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* 4 — Kartu Kutipan & Pengingat (pembatas visual) */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Refleksi hari ini"
        className="mt-8 rounded-[20px] bg-[#4A3B32] p-6 text-[#F5F3EE]"
      >
        <div className="flex items-start justify-between gap-3">
          <Quote className="h-6 w-6 shrink-0 text-[#F5F3EE]/45" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5F3EE]/60">
            Refleksi Hari Ini
          </span>
        </div>
        <p
          className={`${playfair.className} mt-4 text-[17px] italic leading-relaxed text-[#F5F3EE]`}
        >
          &ldquo;{QUOTE_TEXT}&rdquo;
        </p>
        <p className="mt-3 text-xs font-medium text-[#F5F3EE]/70">
          — {QUOTE_AUTHOR}
        </p>
        <Button
          type="button"
          variant="ghost"
          disabled={quoteSaved}
          onClick={() => {
            if (!quoteSaved) {
              saveQuote()
              toast.success('Kutipan disimpan ke jurnal')
            }
          }}
          className="mt-5 h-9 rounded-full border border-[#F5F3EE]/35 px-4 text-[13px] font-semibold text-[#F5F3EE] hover:bg-[#F5F3EE]/10 hover:text-[#F5F3EE] disabled:opacity-60"
        >
          {quoteSaved ? (
            <Check className="h-4 w-4" strokeWidth={2.5} />
          ) : (
            <BookmarkPlus className="h-4 w-4" />
          )}
          {quoteSaved ? 'Tersimpan di Jurnal' : 'Simpan ke Jurnal'}
        </Button>
      </motion.section>
    </div>
  )
}
