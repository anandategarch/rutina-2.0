'use client'

import { useRef } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from 'motion/react'
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
    <motion.div
      layout
      className={
        'relative overflow-hidden rounded-[16px] border transition-colors duration-300 ' +
        (done ? 'border-[#749B5833]' : 'border-[#4A3B321F]') +
        ' bg-white shadow-soft'
      }
    >
      {/* Lapisan isi (absolut, di belakang konten) */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: fillR }}
        className="absolute inset-0 origin-left bg-[#E4EFE0]"
      />
      <motion.div
        aria-hidden="true"
        style={{ scaleX: fillL }}
        className="absolute inset-0 origin-right bg-[#EAE5D9]"
      />

      {/* Ikon petunjuk (di belakang konten, muncul di tepi saat menggeser) */}
      <motion.span
        aria-hidden="true"
        style={{ opacity: hintR }}
        className="absolute left-3.5 top-1/2 z-0 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#749B58] text-white"
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </motion.span>
      <motion.span
        aria-hidden="true"
        style={{ opacity: hintL }}
        className="absolute right-3.5 top-1/2 z-0 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#4A3B32]/15 text-[#4A3B32]"
      >
        <Undo2 className="h-4 w-4" />
      </motion.span>

      {/* Baris konten yang bisa digeser — klik di mana pun (kecuali centang)
          membuka detail kebiasaan. */}
      <motion.div
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
          (done ? 'bg-[#E4EFE0]' : 'bg-white')
        }
      >
        {/* Tombol lingkaran centang — area kontrol terpisah, target sentuh 32px */}
        <motion.button
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
            'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] disabled:cursor-not-allowed ' +
            (done
              ? 'border-[#749B58] bg-[#749B58] text-white'
              : readOnly
                ? 'border-[#4A3B32]/20 text-transparent'
                : 'border-[#4A3B3240] text-transparent hover:border-[#749B58]/60')
          }
        >
          <motion.span
            key={String(done)}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            aria-hidden="true"
            className="flex"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </motion.span>
        </motion.button>

        {/* Judul kebiasaan */}
        <span
          className={
            'min-w-0 flex-1 truncate text-left text-[15px] font-medium transition-colors duration-300 ' +
            (done
              ? 'text-[#231F1E]/45 line-through decoration-[#231F1E]/30'
              : 'text-[#231F1E]')
          }
        >
          {habit.title}
        </span>

        {/* Pil meta: streak nyata atau kategori */}
        {streak > 0 ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#EAE5D9] px-2.5 py-1 text-[11px] font-bold text-[#4A3B32]">
            <Flame className="h-3.5 w-3.5" />
            {streak} hari
          </span>
        ) : habit.cat !== 'Kebiasaan' ? (
          <span className="shrink-0 rounded-full bg-[#E4EFE0] px-2.5 py-1 text-[11px] font-bold text-[#4A3B32]">
            {habit.cat}
          </span>
        ) : null}

        {/* Ganjaran XP */}
        {typeof xp === 'number' && (
          <span
            className={
              'flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold tabular-nums transition-colors duration-300 ' +
              (done
                ? 'bg-[#4A3B32]/10 text-[#4A3B32]/45'
                : 'bg-[#749B58]/15 text-[#658A4C]')
            }
          >
            <Zap className="h-3 w-3" strokeWidth={2.4} />+{xp}
          </span>
        )}

        {/* Chevron detail */}
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 text-[#4A3B32]/40"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>

        {/* XP pop — mengambang naik saat kebiasaan baru selesai */}
        <AnimatePresence>
          {done && typeof xp === 'number' && !readOnly && (
            <motion.span
              key="xp-pop"
              aria-hidden="true"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -30 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, times: [0, 0.2, 0.75, 1] }}
              className="pointer-events-none absolute right-12 top-1/2 text-[11px] font-bold text-[#658A4C]"
            >
              +{xp} XP
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Detail yang bisa dibuka-tutup */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 overflow-hidden bg-white"
          >
            <div className="border-t border-[#4A3B3214] px-3.5 pb-4 pt-3 text-left">
              <p className="text-[13px] leading-relaxed text-[#231F1E]/75">
                {habit.desc || 'Belum ada deskripsi untuk kebiasaan ini.'}
              </p>

              {/* Meta jadwal, pengingat, target pekanan */}
              <dl className="mt-3 grid grid-cols-1 gap-1.5">
                <div className="flex items-center gap-2 text-[11px] font-medium text-[#4A3B32]/80">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#749B58]" />
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
                <div className="flex items-center gap-2 text-[11px] font-medium text-[#4A3B32]/80">
                  <Repeat className="h-3.5 w-3.5 shrink-0 text-[#749B58]" />
                  <span>
                    {weekDone}/{habit.weeklyTarget} target pekan ini
                  </span>
                </div>
                {habit.reminder && (
                  <div className="flex items-center gap-2 text-[11px] font-medium text-[#4A3B32]/80">
                    <Bell className="h-3.5 w-3.5 shrink-0 text-[#749B58]" />
                    <span>Pengingat {habit.reminder} WIB</span>
                  </div>
                )}
              </dl>

              {/* Riwayat 14 hari nyata */}
              <div className="mt-3 flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/70">
                  14 hari
                </span>
                <div className="flex flex-wrap gap-1">
                  {recent.map((h, j) => (
                    <span
                      key={j}
                      aria-hidden="true"
                      className={
                        'h-2.5 w-2.5 rounded-full ' +
                        (h ? 'bg-[#749B58]' : 'bg-[#EAE5D9]')
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
                  className="h-9 flex-1 rounded-full text-[13px] font-semibold text-[#4A3B32] hover:bg-[#EAE5D9] hover:text-[#231F1E]"
                >
                  Sembunyikan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEdit}
                  className="h-9 flex-1 rounded-full border-[#749B58]/40 text-[13px] font-semibold text-[#658A4C] hover:bg-[#E4EFE0] hover:text-[#658A4C]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {readOnly ? (
                  <span className="flex h-9 flex-1 items-center justify-center rounded-full bg-[#EAE5D9] text-[12px] font-semibold text-[#4A3B32]/60">
                    Belum terjadi
                  </span>
                ) : done ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onToggle}
                    className="h-9 flex-1 rounded-full text-[13px] font-semibold text-[#4A3B32] hover:bg-[#EAE5D9] hover:text-[#231F1E]"
                  >
                    Batalkan
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={onToggle}
                    className="h-9 flex-1 rounded-full bg-[#749B58] text-[13px] font-semibold text-white hover:bg-[#658A4C]"
                  >
                    Tandai Selesai
                  </Button>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
