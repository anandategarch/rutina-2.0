'use client'

import { useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  ArrowRight,
  Check,
  CheckCheck,
  Flame,
  Move,
  Play,
  Star,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { goToStyle } from './bits'

const AVATARS = ['AP', 'BD', 'CR', 'DI']
const AVATAR_BG = ['bg-[#E4EFE0]', 'bg-[#EAE5D9]', 'bg-[#FAF9F6]', 'bg-[#F5F3EE]']

const PHONE_HABITS = [
  { name: 'Meditasi 10 menit', time: '06.30', done: true },
  { name: 'Baca 20 halaman', time: '21.00', done: true },
  { name: 'Lari pagi 3 km', time: '07.00', done: false },
]

function Word({
  children,
  delay,
  className = '',
}: {
  children: ReactNode
  delay: number
  className?: string
}) {
  return (
    <span className="-mb-1 block overflow-hidden pb-1">
      <motion.span
        className={`block ${className}`}
        initial={{ y: '112%' }}
        animate={{ y: '0%' }}
        transition={{ delay, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function Float({
  className,
  delay,
  children,
}: {
  className: string
  delay: number
  children: ReactNode
}) {
  return (
    <motion.div
      className={`absolute z-20 ${className}`}
      initial={{ opacity: 0, y: 26, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 210, damping: 17 }}
    >
      <motion.div
        animate={{ y: [0, -9, 0] }}
        transition={{
          duration: 3.8 + delay,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export default function SplitScreen() {
  const panelRef = useRef<HTMLDivElement>(null)

  return (
    <section className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      {/* ============ Panel kiri (gelap) ============ */}
      <div className="relative flex flex-col justify-center overflow-hidden bg-[#231F1E] px-6 pb-16 pt-28 text-[#F5F3EE] sm:px-10 lg:h-screen lg:py-0">
        <div
          aria-hidden
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#749B58]/15 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#E4EFE0]/10 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#749B58] to-[#658A4C] shadow-lg shadow-[#749B58]/25">
              <CheckCheck className="h-5 w-5 text-[#FAF9F6]" />
            </div>
            <span className="text-lg font-semibold tracking-tight">rutina</span>
            <Badge
              variant="secondary"
              className="border border-[#4A3B32] bg-[#4A3B32]/40 text-[#F5F3EE]/70"
            >
              v2.0
            </Badge>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-[#4A3B32] bg-[#4A3B32]/40 px-3 py-1.5 text-xs text-[#F5F3EE]/60"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#749B58]" />
            Pelacak kebiasaan — sekarang dengan mode fokus
          </motion.div>

          <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            <Word delay={0.2}>Kebiasaan kecil,</Word>
            <Word
              delay={0.32}
              className="bg-gradient-to-r from-[#749B58] to-[#658A4C] bg-clip-text text-transparent"
            >
              dampak besar.
            </Word>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="mt-5 max-w-md text-base leading-relaxed text-[#F5F3EE]/60 sm:text-lg"
          >
            Rutina mengubah niat harian menjadi sistem: pengingat tepat waktu,
            streak yang memotivasi, dan progres yang benar-benar terlihat.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Button
              size="lg"
              onClick={() =>
                toast.info('Ini contoh gaya Split Screen', {
                  description: 'Di produksi, tombol ini membuka form pendaftaran.',
                })
              }
              className="h-12 rounded-xl bg-[#749B58] px-6 text-base font-semibold text-[#FAF9F6] shadow-lg shadow-[#749B58]/25 hover:bg-[#658A4C]"
            >
              Mulai gratis <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => goToStyle(0)}
              className="h-12 rounded-xl border-[#4A3B32] bg-transparent px-6 text-base text-[#F5F3EE] hover:bg-[#4A3B32]/50 hover:text-[#FAF9F6]"
            >
              <Play className="h-4 w-4" /> Lihat demo 2 menit
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <div className="flex -space-x-2.5">
              {AVATARS.map((a, i) => (
                <span
                  key={a}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#231F1E] text-[10px] font-bold text-[#4A3B32] ${AVATAR_BG[i]}`}
                >
                  {a}
                </span>
              ))}
            </div>
            <div>
              <div className="flex text-[#749B58]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="mt-1 text-xs text-[#F5F3EE]/60">
                4.9/5 · dipakai 12.400+ orang di Indonesia
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ============ Panel kanan (terang) ============ */}
      <div
        ref={panelRef}
        className="relative flex items-center justify-center overflow-hidden bg-[#F5F3EE] px-6 py-16 sm:py-20 lg:h-screen"
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(#EAE5D9 1.2px, transparent 1.2px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div
          aria-hidden
          className="absolute h-[30rem] w-[30rem] rounded-full bg-[#E4EFE0]/70 blur-3xl"
        />

        <div className="relative">
          {/* Mockup HP */}
          <motion.div
            initial={{ opacity: 0, y: 44, scale: 0.92, rotate: -4 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 120, damping: 16 }}
            className="relative z-10"
          >
            <div className="w-[240px] rounded-[2.4rem] border-[7px] border-[#231F1E] bg-white shadow-2xl shadow-[#4A3B32]/20 sm:w-[264px]">
              <div className="relative overflow-hidden rounded-[1.8rem] bg-[#F5F3EE]">
                <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-[#231F1E]" />
                <div className="space-y-2.5 p-4 pt-9">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[#4A3B32]/60">
                        Selasa, 4 Juni
                      </p>
                      <h3 className="text-base font-semibold text-[#231F1E]">Hari ini</h3>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E4EFE0]">
                      <Flame className="h-4 w-4 text-[#4A3B32]" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#4A3B321F] bg-white p-3 shadow-sm">
                    <div className="flex justify-between text-[10px] font-medium">
                      <span className="text-[#4A3B32]/60">Progres hari ini</span>
                      <span className="font-semibold text-[#749B58]">2 dari 3</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E4EFE0]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '66%' }}
                        transition={{ delay: 0.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-[#749B58] to-[#658A4C]"
                      />
                    </div>
                  </div>

                  {PHONE_HABITS.map((h, i) => (
                    <motion.div
                      key={h.name}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.12 }}
                      className="flex items-center gap-2.5 rounded-2xl border border-[#4A3B321F] bg-white p-2.5"
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          h.done ? 'bg-[#749B58] text-[#FAF9F6]' : 'border-2 border-[#4A3B3240]'
                        }`}
                      >
                        {h.done && <Check className="h-3 w-3" />}
                      </span>
                      <span
                        className={`flex-1 text-xs font-medium ${
                          h.done ? 'text-[#231F1E]/45 line-through' : 'text-[#231F1E]'
                        }`}
                      >
                        {h.name}
                      </span>
                      <span className="text-[10px] text-[#4A3B32]/60">{h.time}</span>
                    </motion.div>
                  ))}

                  <div className="flex items-center justify-between rounded-2xl bg-[#231F1E] p-3 text-[#F5F3EE]">
                    <div>
                      <p className="text-[10px] text-[#F5F3EE]/70">Streak saat ini</p>
                      <p className="text-lg font-semibold leading-tight">
                        12 <span className="text-[10px] font-normal text-[#F5F3EE]/70">hari</span>
                      </p>
                    </div>
                    <Flame className="h-5 w-5 animate-pulse text-[#749B58]" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Kartu melayang: streak */}
          <Float className="-left-6 -top-14 sm:-left-36 sm:top-6 lg:-left-16 lg:-top-12 xl:-left-36 xl:top-6" delay={0.7}>
            <div className="w-36 rounded-2xl border border-[#4A3B321F] bg-white/95 p-3 shadow-xl shadow-[#4A3B32]/10 backdrop-blur sm:w-40">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E4EFE0]">
                  <Flame className="h-4 w-4 text-[#4A3B32]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#231F1E]">30 hari</p>
                  <p className="text-[10px] text-[#4A3B32]/60">streak terpanjang</p>
                </div>
              </div>
            </div>
          </Float>

          {/* Kartu melayang: fokus */}
          <Float className="-bottom-16 -right-5 sm:-bottom-8 sm:-right-36 lg:-bottom-14 lg:-right-16 xl:-bottom-8 xl:-right-36" delay={0.85}>
            <div className="w-40 rounded-2xl border border-[#4A3B321F] bg-white/95 p-3 shadow-xl shadow-[#4A3B32]/10 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E4EFE0]">
                  <Timer className="h-4 w-4 text-[#4A3B32]" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold tabular-nums text-[#231F1E]">25:00</p>
                  <p className="flex items-center gap-1 text-[10px] text-[#4A3B32]/60">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-[#749B58]" />
                    sesi fokus berjalan
                  </p>
                </div>
              </div>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#E4EFE0]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '62%' }}
                  transition={{ delay: 1.3, duration: 1 }}
                  className="h-full rounded-full bg-[#749B58]"
                />
              </div>
            </div>
          </Float>

          {/* Badge konsistensi */}
          <Float className="-top-11 -right-3 hidden sm:-right-10 sm:flex" delay={1}>
            <div className="flex items-center gap-2 rounded-full border border-[#4A3B321F] bg-white/95 px-3.5 py-2 shadow-lg shadow-[#4A3B32]/10 backdrop-blur">
              <TrendingUp className="h-3.5 w-3.5 text-[#749B58]" />
              <span className="text-xs font-semibold text-[#231F1E]">92% konsisten</span>
            </div>
          </Float>
        </div>

        {/* Pil yang bisa digeser (drag) */}
        <motion.div
          drag
          dragConstraints={panelRef}
          dragElastic={0.25}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          whileHover={{ scale: 1.03 }}
          whileDrag={{ scale: 1.06 }}
          className="absolute bottom-6 left-6 z-30 flex h-11 cursor-grab touch-none items-center gap-2 rounded-full border border-[#4A3B3233] bg-white/90 px-4 text-xs font-medium text-[#4A3B32] shadow-lg backdrop-blur active:cursor-grabbing"
        >
          <Move className="h-3.5 w-3.5" /> Geser aku
        </motion.div>
      </div>
    </section>
  )
}

