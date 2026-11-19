'use client'

import { useMemo, useRef } from 'react'
import {
  AnimatePresence,
  useMotionValue,
  useTransform,
} from 'motion/react'
import * as m from 'motion/react-m'
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Flame,
  Link2,
  Pencil,
  Repeat,
  Undo2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { PLANT_STAGES, plantStageOf, triggerLabelOf } from './habit-coach'
import { PlantGlyph } from './plant-glyph'
import { type Habit, todayISO, useRutina } from './store'

import { motionTokens } from '@/lib/motion/tokens'
import { pressSnappy } from '@/lib/motion/transitions'
/**
 * Baris kebiasaan: geser kanan untuk menandai selesai, geser kiri untuk
 * membatalkan. Area klik DIPISAHKAN tegas:
 * - Tombol lingkaran centang (32px, target sentuh luas) = satu-satunya
 *   cara menandai selesai.
 * - Sisa baris (judul, pil meta, chevron) = membuka detail.
 */
export function TaskRow({
  habit,
  done,
  streak,
  recent,
  weekDone,
  xp,
  expanded,
  readOnly = false,
  onToggle,
  onExpand,
  onEdit,
}: {
  habit: Habit
  done: boolean
  /** Streak aktif nyata (dihitung parent dari histori). */
  streak: number
  /** 14 hari terakhir berakhir pada tanggal yang dilihat. */
  recent: boolean[]
  /** Selesai dalam pekan berjalan vs target mingguan. */
  weekDone: number
  xp?: number
  expanded: boolean
  /** true bila tanggal yang dilihat masa depan — centang dimatikan. */
  readOnly?: boolean
  onToggle: () => void
  onExpand: () => void
  onEdit: () => void
}) {
  const dragGuardRef = useRef(false)

  /* Kecerdasan kebiasaan — pemicu susun & tahap tanaman dibaca langsung
     dari store agar baris tetap ringkas tanpa prop tambahan dari induk. */
  const allHabits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const today = todayISO()
  const triggerLabel = habit.afterId
    ? triggerLabelOf(allHabits, habit)
    : null
  const plant = useMemo(
    () => plantStageOf(habit, completions, today),
    [habit, completions, today],
  )
  const nextStageLabel = plant.nextAt
    ? PLANT_STAGES[plant.index + 1]?.label
    : null

  const x = useMotionValue(0)
  /* Isi hijau yang terkuak saat menggeser ke kanan (tandai selesai) */
  const fillR = useTransform(x, [10, 80], [0, 1])
  /* Isi pasir yang terkuak saat menggeser ke kiri (batalkan) */
  const fillL = useTransform(x, [-80, -10], [1, 0])
  /* Opasitas ikon petunjuk di tepi kartu selama menggeser */
  const hintR = useTransform(x, [10, 60], [0, 1])
  const hintL = useTransform(x, [-60, -10], [0, 1])

  return (
    <m.div
      layout
      className={
        'relative overflow-hidden rounded-lg border transition-colors duration-300 ' +
        (done ? 'border-primary/20' : 'border-border') +
        ' bg-surface-primary shadow-soft'
      }
    >
      {/* Lapisan isi (absolut, di belakang konten) */}
      <m.div
        aria-hidden="true"
        style={{ scaleX: fillR }}
        className="absolute inset-0 origin-left bg-secondary"
      />
      <m.div
        aria-hidden="true"
        style={{ scaleX: fillL }}
        className="absolute inset-0 origin-right bg-surface-secondary"
      />

      {/* Ikon petunjuk (di belakang konten, muncul di tepi saat menggeser) */}
      <m.span
        aria-hidden="true"
        style={{ opacity: hintR }}
        className="absolute left-3.5 top-1/2 z-0 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </m.span>
      <m.span
        aria-hidden="true"
        style={{ opacity: hintL }}
        className="absolute right-3.5 top-1/2 z-0 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-content-secondary/15 text-content-secondary"
      >
        <Undo2 className="h-4 w-4" />
      </m.span>

      {/* Baris konten yang bisa digeser — klik di mana pun (kecuali centang)
          membuka detail kebiasaan. */}
      <m.div
        style={{ x }}
        drag={readOnly ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.45}
        onDragStart={() => {
          dragGuardRef.current = true
        }}
        onDragEnd={(_, info) => {
          window.setTimeout(() => {
            dragGuardRef.current = false
          }, 120)
          if (info.offset.x > 72 || info.velocity.x > 420) {
            if (!done) onToggle()
          } else if (info.offset.x < -72 || info.velocity.x < -420) {
            if (done) onToggle()
          }
        }}
        onClick={() => {
          if (!dragGuardRef.current) onExpand()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onExpand()
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${habit.title} — ketuk untuk detail, tombol lingkaran untuk menandai selesai`}
        whileTap={{ scale: 0.985 }}
        className={
          'relative z-10 flex flex-wrap cursor-pointer items-center gap-2 p-3 transition-colors duration-300 ' +
          (done ? 'bg-secondary' : 'bg-surface-primary')
        }
      >
        {/* Tombol lingkaran centang — area kontrol terpisah, target sentuh 32px */}
        <m.button
          type="button"
          disabled={readOnly}
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          whileTap={{ scale: 0.85 }}
          role="checkbox"
          aria-checked={done}
          aria-disabled={readOnly}
          aria-label={`Tandai selesai: ${habit.title}`}
          className={
            'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed ' +
            (done
              ? 'border-primary bg-primary text-primary-foreground'
              : readOnly
                ? 'border-border text-transparent'
                : 'border-border-strong text-transparent hover:border-primary/60')
          }
        >
          <m.span
            key={String(done)}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={pressSnappy}
            aria-hidden="true"
            className="flex"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </m.span>
        </m.button>

        {/* Judul kebiasaan — flex-1 dengan basis minimum 9rem: di kartu
            lebar judul memenuhi sisa baris; di kartu sempit (kisi 2 kolom
            desktop, lihat audit responsif v2.13) grup pil menurun ke
            baris kedua alih-alih menjepit judul menjadi ±24px. */}
        <span
          className={
            'min-w-0 flex-1 basis-36 text-left text-section font-medium leading-snug break-words line-clamp-2 transition-colors duration-300 ' +
            (done
              ? 'text-content-muted line-through'
              : 'text-content-primary')
          }
        >
          {habit.title}
        </span>

        {/* Grup pil meta (streak/kategori, XP, chevron) — satu unit yang
            utuh: muat di baris judul bila lega, menurun rapi bila sempit. */}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
        {/* Pil meta: streak nyata (kompak — angka + api, satuan "hari"
            di title & sr-only agar baris tetap lega di layar sempit) atau kategori */}
        {streak > 0 ? (
          <span
            title={`${streak} hari berturut-turut`}
            className="flex shrink-0 items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-eyebrow font-semibold text-content-secondary"
          >
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {streak}
            <span className="sr-only"> hari</span>
          </span>
        ) : habit.cat !== 'Kebiasaan' ? (
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-eyebrow font-semibold text-content-secondary">
            {habit.cat}
          </span>
        ) : null}

        {/* Ganjaran XP */}
        {typeof xp === 'number' && (
          <span
            className={
              'flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-eyebrow font-semibold tabular-nums transition-colors duration-300 ' +
              (done
                ? 'bg-content-secondary/10 text-content-muted'
                : 'bg-primary/15 text-success')
            }
          >
            <Zap className="h-3 w-3" strokeWidth={2.4} />+{xp}
          </span>
        )}

        {/* Chevron detail */}
        <m.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 text-content-muted"
        >
          <ChevronDown className="h-4 w-4" />
        </m.span>
        </span>

        {/* XP pop — mengambang naik saat kebiasaan baru selesai */}
        <AnimatePresence>
          {done && typeof xp === 'number' && !readOnly && (
            <m.span
              key="xp-pop"
              aria-hidden="true"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -30 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, times: [0, 0.2, 0.75, 1] }}
              className="pointer-events-none absolute right-12 top-1/2 text-eyebrow font-semibold text-success"
            >
              +{xp} XP
            </m.span>
          )}
        </AnimatePresence>
      </m.div>

      {/* Detail yang bisa dibuka-tutup */}
      <AnimatePresence initial={false}>
        {expanded && (
          <m.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: motionTokens.easing.standard }}
            className="relative z-10 overflow-hidden bg-surface-primary"
          >
            <div className="border-t border-border px-3 pb-4 pt-3 text-left">
              <p className="text-note leading-relaxed text-content-secondary">
                {habit.desc || 'Belum ada deskripsi untuk kebiasaan ini.'}
              </p>

              {/* Pil pemicu susun kebiasaan: "Setelah [pemicu]" */}
              {triggerLabel && (
                <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-eyebrow font-semibold text-success">
                  <Link2
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0"
                    strokeWidth={2.4}
                  />
                  Setelah {triggerLabel}
                </p>
              )}

              {/* Meta jadwal, pengingat, target pekanan */}
              <dl className="mt-3 grid grid-cols-1 gap-1.5">
                <div className="flex items-center gap-2 text-eyebrow font-medium text-content-muted">
                  <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    {habit.schedule.length === 0
                      ? 'Terjadwal setiap hari'
                      : 'Terjadwal: ' +
                        [...habit.schedule]
                          .sort((a, b) => a - b)
                          .map((d) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d])
                          .join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-eyebrow font-medium text-content-muted">
                  <Repeat aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    {weekDone}/{habit.weeklyTarget} target pekan ini
                  </span>
                </div>
                {habit.reminder && (
                  <div className="flex items-center gap-2 text-eyebrow font-medium text-content-muted">
                    <Bell aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>Pengingat {habit.reminder} WIB</span>
                  </div>
                )}
              </dl>

              {/* Riwayat 14 hari nyata */}
              <div className="mt-3 flex items-center gap-2">
                <span className="shrink-0 text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                  14 hari
                </span>
                <div className="flex flex-wrap gap-1">
                  {recent.map((h, j) => (
                    <span
                      key={j}
                      aria-hidden="true"
                      className={
                        'h-2.5 w-2.5 rounded-full ' +
                        (h ? 'bg-primary' : 'bg-surface-secondary')
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Versi 2 Menit — aksi sekunder: cukup bentuk terkecil,
                  tetap dihitung selesai untuk tanggal baris ini. */}
              {habit.mini && !done && !readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    onToggle()
                    toast.success(`Cukup ${habit.mini} — dihitung!`)
                  }}
                  aria-label={`Selesaikan versi 2 menit: ${habit.mini}`}
                  className="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-secondary/40 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-success">
                    <Zap className="h-4 w-4" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-chart-label font-semibold uppercase tracking-[0.14em] text-content-muted">
                      Versi 2 menit
                    </span>
                    <span className="mt-0.5 block truncate text-note font-semibold text-content-primary">
                      {habit.mini}
                    </span>
                  </span>
                  <span className="shrink-0 text-eyebrow font-semibold text-success">
                    Selesaikan
                  </span>
                </button>
              )}

              {/* Tahap tanaman — Taman Pertumbuhan mini di dalam detail */}
              <div className="mt-3 rounded-xl bg-surface-secondary/70 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="text-module-accent-strong"
                  >
                    <PlantGlyph stage={plant.stage.key} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-meta font-bold text-content-primary">
                    {plant.stage.label}
                  </span>
                  <span className="ml-auto shrink-0 text-eyebrow font-semibold tabular-nums text-content-muted">
                    {plant.nextAt
                      ? `${plant.total} dari ${plant.nextAt} untuk ${nextStageLabel}`
                      : 'Tahap akhir'}
                  </span>
                </div>
                <p className="mt-1 text-eyebrow leading-snug text-content-muted">
                  {plant.stage.hint}
                </p>
              </div>

              {/* Aksi */}
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onExpand}
                  className="h-9 flex-1 rounded-full text-note font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
                >
                  Sembunyikan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEdit}
                  className="h-9 flex-1 rounded-full border-primary/40 text-note font-semibold text-success hover:bg-secondary hover:text-success"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {readOnly ? (
                  <span className="flex h-9 flex-1 items-center justify-center rounded-full bg-surface-secondary text-meta font-semibold text-content-muted">
                    Belum terjadi
                  </span>
                ) : done ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onToggle}
                    className="h-9 flex-1 rounded-full text-note font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
                  >
                    Batalkan
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={onToggle}
                    className="h-9 flex-1 rounded-full bg-primary text-note font-semibold text-primary-foreground hover:bg-action-hover"
                  >
                    Tandai Selesai
                  </Button>
                )}
              </div>
            </div>
          </m.section>
        )}
      </AnimatePresence>
    </m.div>
  )
}
