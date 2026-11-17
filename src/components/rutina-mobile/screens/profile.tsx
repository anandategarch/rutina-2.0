'use client'

import { motion } from 'motion/react'
import {
  Bell,
  ChevronRight,
  Globe,
  HelpCircle,
  Info,
  Leaf,
  LogOut,
  Moon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Switch } from '@/components/ui/switch'

import { Counter } from '../counter'
import { useRutina } from '../store'

export default function ProfileScreen() {
  const notes = useRutina((s) => s.notes)
  const tasks = useRutina((s) => s.tasks)

  const pct = Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)

  const stats = [
    { label: 'Catatan', value: notes.length, percent: false },
    { label: 'Streak (hari)', value: 21, percent: false },
    { label: 'Selesai', value: pct, percent: true },
  ]

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-5">
      <header>
        <h1 className="text-[19px] font-bold tracking-tight text-[#231F1E]">
          Profil
        </h1>
      </header>

      {/* Kartu profil */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-24px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 flex flex-col items-center rounded-[20px] border border-[#4A3B321F] bg-white p-5 text-center"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4A3B32] text-lg font-bold text-[#FAF9F6]">
          AN
        </span>
        <h2 className="mt-3 text-lg font-bold tracking-tight text-[#231F1E]">
          Ananda
        </h2>
        <p className="mt-0.5 text-xs font-medium text-[#4A3B32]/65">
          ananda@rutina.app
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E4EFE0] px-3 py-1 text-[11px] font-bold text-[#4A3B32]">
          <Leaf className="h-3 w-3 text-[#749B58]" />
          Anggota sejak Juni 2025
        </span>
      </motion.div>

      {/* Baris statistik ringkas */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{
              duration: 0.5,
              delay: i * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex flex-col items-center rounded-[16px] border border-[#4A3B321F] bg-white p-3.5"
          >
            <p className="flex items-baseline">
              <span className="text-[22px] font-semibold leading-none tracking-tight text-[#231F1E]">
                <Counter to={s.value} />
              </span>
              {s.percent ? (
                <span className="text-sm font-semibold text-[#231F1E]">%</span>
              ) : null}
            </p>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#4A3B32]/60">
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Kartu pengaturan */}
      <div className="mt-3 overflow-hidden rounded-[20px] border border-[#4A3B321F] bg-white">
        <div className="divide-y divide-[#4A3B3214]">
          {/* Notifikasi */}
          <div className="flex min-h-[54px] items-center gap-3 px-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
              <Bell className="h-4 w-4" />
            </span>
            <span className="flex-1 text-[14px] font-medium text-[#231F1E]">
              Notifikasi
            </span>
            <Switch
              defaultChecked
              aria-label="Notifikasi"
              onCheckedChange={(checked) =>
                toast(`Notifikasi ${checked ? 'diaktifkan' : 'dimatikan'}`)
              }
              className="data-[state=checked]:bg-[#749B58]"
            />
          </div>

          {/* Mode Gelap */}
          <div className="flex min-h-[54px] items-center gap-3 px-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
              <Moon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-[14px] font-medium text-[#231F1E]">
              Mode Gelap
            </span>
            <Switch
              checked={false}
              aria-label="Mode gelap"
              onCheckedChange={() => toast('Mode gelap segera hadir')}
              className="data-[state=checked]:bg-[#749B58]"
            />
          </div>

          {/* Bahasa */}
          <button
            type="button"
            onClick={() => toast('Bahasa Indonesia sudah aktif')}
            className="flex min-h-[54px] w-full cursor-pointer items-center gap-3 px-4 text-left transition-colors hover:bg-[#F5F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
              <Globe className="h-4 w-4" />
            </span>
            <span className="flex-1 text-[14px] font-medium text-[#231F1E]">
              Bahasa
            </span>
            <span className="text-[13px] font-semibold text-[#4A3B32]/70">
              Indonesia
            </span>
            <ChevronRight className="h-4 w-4 text-[#4A3B32]/40" />
          </button>

          {/* Pusat Bantuan */}
          <button
            type="button"
            onClick={() => toast('Pusat bantuan segera hadir')}
            className="flex min-h-[54px] w-full cursor-pointer items-center gap-3 px-4 text-left transition-colors hover:bg-[#F5F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
              <HelpCircle className="h-4 w-4" />
            </span>
            <span className="flex-1 text-[14px] font-medium text-[#231F1E]">
              Pusat Bantuan
            </span>
            <ChevronRight className="h-4 w-4 text-[#4A3B32]/40" />
          </button>

          {/* Tentang Rutina */}
          <button
            type="button"
            onClick={() => toast('Rutina 2.0 — Earth Tone Edition')}
            className="flex min-h-[54px] w-full cursor-pointer items-center gap-3 px-4 text-left transition-colors hover:bg-[#F5F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
              <Info className="h-4 w-4" />
            </span>
            <span className="flex-1 text-[14px] font-medium text-[#231F1E]">
              Tentang Rutina
            </span>
            <ChevronRight className="h-4 w-4 text-[#4A3B32]/40" />
          </button>
        </div>
      </div>

      {/* Keluar */}
      <button
        type="button"
        onClick={() => toast('Sampai jumpa lagi besok!')}
        className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#4A3B32]/20 bg-white text-[14px] font-semibold text-[#4A3B32] transition-colors hover:bg-[#EAE5D9] hover:text-[#231F1E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </button>

      <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-[#4A3B32]/50">
        Earth Tone Edition — 2025
      </p>
    </div>
  )
}
