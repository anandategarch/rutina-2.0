'use client'

import { useRef } from 'react'
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
  Pencil,
  Repeat,
  Undo2,
  Zap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { type Habit } from './store'

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
        'relative overflow-hidden rounded-[16px] border transition-colors duration-300 ' +
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
          'relative z-10 flex cursor-pointer items-center gap-2 p-3.5 transition-colors duration-300 ' +
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
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            aria-hidden="true"
            className="flex"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </m.span>
        </m.button>

        {/* Judul kebiasaan */}
        <span
          className={
            'min-w-0 flex-1 truncate text-left text-[15px] font-medium transition-colors duration-300 ' +
            (done
              ? 'text-content-muted line-through'
              : 'text-content-primary')
          }
        >
          {habit.title}
        </span>

        {/* Pil meta: streak nyata atau kategori */}
        {streak > 0 ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-bold text-content-secondary">
            <Flame className="h-3.5 w-3.5" />
            {streak} hari
          </span>
        ) : habit.cat !== 'Kebiasaan' ? (
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-content-secondary">
            {habit.cat}
          </span>
        ) : null}

        {/* Ganjaran XP */}
        {typeof xp === 'number' && (
          <span
            className={
              'flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold tabular-nums transition-colors duration-300 ' +
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
              className="pointer-events-none absolute right-12 top-1/2 text-[11px] font-bold text-success"
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
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 overflow-hidden bg-surface-primary"
          >
            <div className="border-t border-border px-3.5 pb-4 pt-3 text-left">
              <p className="text-[13px] leading-relaxed text-content-secondary">
                {habit.desc || 'Belum ada deskripsi untuk kebiasaan ini.'}
              </p>

              {/* Meta jadwal, pengingat, target pekanan */}
              <dl className="mt-3 grid grid-cols-1 gap-1.5">
                <div className="flex items-center gap-2 text-[11px] font-medium text-content-muted">
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
                <div className="flex items-center gap-2 text-[11px] font-medium text-content-muted">
                  <Repeat aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    {weekDone}/{habit.weeklyTarget} target pekan ini
                  </span>
                </div>
                {habit.reminder && (
                  <div className="flex items-center gap-2 text-[11px] font-medium text-content-muted">
                    <Bell aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>Pengingat {habit.reminder} WIB</span>
                  </div>
                )}
              </dl>

              {/* Riwayat 14 hari nyata */}
              <div className="mt-3 flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
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

              {/* Aksi */}
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onExpand}
                  className="h-9 flex-1 rounded-full text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
                >
                  Sembunyikan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEdit}
                  className="h-9 flex-1 rounded-full border-primary/40 text-[13px] font-semibold text-success hover:bg-secondary hover:text-success"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {readOnly ? (
                  <span className="flex h-9 flex-1 items-center justify-center rounded-full bg-surface-secondary text-[12px] font-semibold text-content-muted">
                    Belum terjadi
                  </span>
                ) : done ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onToggle}
                    className="h-9 flex-1 rounded-full text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
                  >
                    Batalkan
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={onToggle}
                    className="h-9 flex-1 rounded-full bg-primary text-[13px] font-semibold text-primary-foreground hover:bg-action-hover"
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
