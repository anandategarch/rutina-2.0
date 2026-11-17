'use client'

/**
 * Desktop Stage — kebangkitan split screen lama (commit 27713ab,
 * src/components/landing/split-screen.tsx) yang sempat dihapus saat
 * fokus mobile-only. Kini hadir kembali dengan tema earth-tone:
 *
 *   ┌─────────────────┬────────┬──────────────┐
 *   │  Panel Brand    │  Rail  │  Bingkai HP  │
 *   │  (cerita + CTA) │ widget │  (aplikasi)  │
 *   └─────────────────┴────────┴──────────────┘
 *
 * Di bawah lg (1024px) panel & rail disembunyikan dan aplikasi
 * kembali full-bleed seperti sebelumnya — satu instance RutinaApp,
 * tanpa duplikasi state.
 */

import type { ComponentType, ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  BarChart3,
  BookOpen,
  Check,
  Flame,
  Leaf,
  Timer,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { RutinaApp } from './rutina-app'
import { playfair } from './serif'

const EASE = [0.22, 1, 0.36, 1] as const

/* ===== Potongan: kata dengan reveal mask (warisan split-screen lama) ===== */

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
        transition={{ delay, duration: 0.85, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  )
}

/* Widget melayang — kartu kecil dengan animasi apung sinar sinambung. */
function FloatWidget({
  icon: Icon,
  value,
  label,
  delay,
  tilt = 0,
  iconClass,
}: {
  icon: LucideIcon
  value: string
  label: string
  delay: number
  tilt?: number
  iconClass: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 18 }}
      style={{ rotate: tilt }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 3.6 + delay,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        }}
        className="flex w-full items-center gap-3 rounded-[18px] border border-[#4A3B32]/10 bg-white p-3.5 shadow-lift"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold leading-tight tabular-nums text-[#231F1E]">
            {value}
          </span>
          <span className="block text-[10.5px] font-semibold text-[#4A3B32]/65">
            {label}
          </span>
        </span>
      </motion.div>
    </motion.div>
  )
}

/* Baris fitur dengan centang muncul beruntun. */
function FeatureRow({
  icon: Icon,
  children,
  delay,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  children: ReactNode
  delay: number
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
      className="flex items-center gap-2.5 text-[13.5px] font-medium text-[#4A3B32]"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#749B58]/15 text-[#658A4C]">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <Icon className="h-4 w-4 shrink-0 text-[#4A3B32]/45" strokeWidth={2} />
      {children}
    </motion.li>
  )
}

const AVATARS = [
  { init: 'AP', bg: 'bg-[#749B58]' },
  { init: 'BD', bg: 'bg-[#B25E3F]' },
  { init: 'CR', bg: 'bg-[#C7A17A]' },
  { init: 'DI', bg: 'bg-[#4A3B32]' },
]

/* ===== Panel brand (kiri) ===== */

function BrandPanel() {
  return (
    <aside className="relative hidden w-[38%] max-w-[560px] shrink-0 flex-col justify-between overflow-hidden bg-[#FAF9F6] p-10 lg:flex xl:p-14">
      {/* Cahaya ambien earth-tone */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#E4EFE0] blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-[#EAE5D9]/80 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-72 w-72 translate-x-1/2 rounded-full bg-[#E4EFE0]/60 blur-3xl" />
      </div>

      {/* Kepala panel */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative flex items-center justify-between"
      >
        <p className="text-[21px] font-bold tracking-tight text-[#231F1E]">
          rutina<span className="text-[#749B58]">.</span>
        </p>
        <span className="flex items-center gap-1.5 rounded-full border border-[#749B58]/30 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#658A4C] shadow-soft">
          <Leaf className="h-3 w-3" />
          Earth Tone Edition
        </span>
      </motion.header>

      {/* Cerita utama */}
      <div className="relative">
        <h1
          className={`${playfair.className} text-[clamp(2.1rem,3vw,3.3rem)] font-semibold leading-[1.08] tracking-tight text-[#231F1E]`}
        >
          <Word delay={0.1}>Kebiasaan kecil,</Word>
          <Word delay={0.22} className="text-[#5E8347]">
            perubahan besar.
          </Word>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
          className="mt-5 max-w-[400px] text-[14.5px] leading-relaxed text-[#4A3B32]/80"
        >
          Rutina menyatukan misi harian, jurnal refleksi, keuangan, dan
          analitik dalam satu petualangan XP — dirancang tenang dengan
          palet warna bumi.
        </motion.p>

        {/* Bukti sosial */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.6, ease: EASE }}
          className="mt-7 flex items-center gap-3"
        >
          <div className="flex -space-x-2.5">
            {AVATARS.map((a) => (
              <span
                key={a.init}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FAF9F6] text-[10px] font-bold text-[#FAF9F6] ${a.bg}`}
              >
                {a.init}
              </span>
            ))}
          </div>
          <p className="text-[12.5px] font-semibold text-[#4A3B32]/75">
            <span className="font-bold text-[#231F1E]">12.400+</span> petualang
            <br />
            membangun rutinitasnya di sini
          </p>
        </motion.div>

        {/* Daftar fitur — satu per tab aplikasi */}
        <ul className="mt-8 space-y-3">
          <FeatureRow icon={Zap} delay={0.62}>
            Misi harian ber-XP, level &amp; bonus konsistensi
          </FeatureRow>
          <FeatureRow icon={BookOpen} delay={0.7}>
            Jurnal refleksi dengan kategori &amp; pencarian
          </FeatureRow>
          <FeatureRow icon={Wallet} delay={0.78}>
            Keuangan: saldo, anggaran &amp; tujuan tabungan
          </FeatureRow>
          <FeatureRow icon={BarChart3} delay={0.86}>
            Analitik suasana hati, fokus &amp; tren
          </FeatureRow>
        </ul>

        {/* Ajakan mencoba */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.6 }}
          className="mt-9 flex items-center gap-2 text-[13px] font-bold text-[#5E8347]"
        >
          Coba langsung di sebelah
          <motion.span
            animate={{ x: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            →
          </motion.span>
        </motion.p>
      </div>

      {/* Kaki panel — palet lima tab */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="relative flex items-center justify-between"
      >
        <p className="text-[10.5px] font-medium text-[#4A3B32]/55">
          © 2025 rutina.app — dibuat dengan sunyi &amp; kopi.
        </p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {['#749B58', '#B25E3F', '#3A2E24', '#231F1E', '#C7A17A'].map((c) => (
            <span
              key={c}
              className="h-3 w-3 rounded-full ring-1 ring-[#4A3B32]/10"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </motion.footer>
    </aside>
  )
}

/* ===== Rail widget melayang (tengah) ===== */

function WidgetRail() {
  return (
    <div className="relative hidden w-[190px] shrink-0 flex-col items-center justify-center gap-6 lg:flex">
      <FloatWidget
        icon={Flame}
        value="21 Hari"
        label="Streak menyala"
        delay={0.55}
        tilt={-3}
        iconClass="bg-[#B25E3F]/12 text-[#B25E3F]"
      />
      <FloatWidget
        icon={Timer}
        value="14,5 Jam"
        label="Fokus pekan ini"
        delay={0.75}
        tilt={2.5}
        iconClass="bg-[#4A3B32]/10 text-[#4A3B32]"
      />
      <FloatWidget
        icon={Wallet}
        value="Rp 8,3 jt"
        label="Saldo sehat"
        delay={0.95}
        tilt={-2}
        iconClass="bg-[#C7A17A]/25 text-[#8A6433]"
      />
    </div>
  )
}

/* ===== Panggung utama ===== */

export function DesktopStage() {
  return (
    <div className="h-dvh w-full overflow-hidden bg-[#EFEDE6]">
      <div className="mx-auto flex h-full max-w-[1720px]">
        <BrandPanel />
        <WidgetRail />

        {/* Area aplikasi — meja lembut dengan cahaya ambien */}
        <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden p-4 xl:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#E4EFE0]/70 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] translate-x-1/4 translate-y-1/4 rounded-full bg-[#EAE5D9] blur-3xl" />
          </div>

          {/* Bingkai ponsel: full-bleed di bawah lg, bercasing di atas */}
          <div className="relative h-dvh w-full overflow-hidden lg:h-[min(860px,94%)] lg:w-auto lg:aspect-[9/19] lg:rounded-[46px] lg:border-[10px] lg:border-[#1B1715] lg:bg-[#1B1715] lg:shadow-ink-deep">
            {/* Lubang kamera depan */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-[14px] z-[80] hidden h-[11px] w-[11px] -translate-x-1/2 rounded-full bg-[#0E0C0B] shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)] lg:block"
            />
            <RutinaApp />
          </div>
        </main>
      </div>
    </div>
  )
}
