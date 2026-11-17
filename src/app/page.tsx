import { RutinaApp } from '@/components/rutina-mobile/rutina-app'
import { BrandPanel } from '@/components/showcase/brand-panel'

export default function Page() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-white lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* Panel kiri — narasi & sistem desain (hanya desktop) */}
      <BrandPanel />

      {/* Panel kanan — preview ponsel interaktif */}
      <main className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-[#F5F3EE] lg:h-dvh lg:min-h-0 lg:w-1/2 lg:overflow-y-auto no-scrollbar">
        {/* Cahaya ambien lembut di latar (mode desktop) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#E4EFE0]/70 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#749B58]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EAE5D9]/50 blur-3xl"
        />

        {/* m-auto: memusatkan saat muat, tetap bisa digulir saat viewport pendek */}
        <div className="relative m-auto flex w-full flex-col items-center gap-6 sm:px-8 sm:py-10">
          {/* Pill petunjuk — hanya split screen */}
          <p className="hidden items-center gap-2.5 rounded-full border border-[#4A3B3214] bg-white/80 px-4 py-2 text-xs font-semibold text-[#4A3B32] shadow-sm backdrop-blur lg:flex">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#749B58] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#749B58]" />
            </span>
            Preview interaktif — centang tugas, buka jurnal, coba fiturnya
          </p>

          {/* Bingkai ponsel di desktop; layar penuh di perangkat mobile */}
          <div className="relative h-dvh w-full overflow-hidden bg-[#F5F3EE] sm:h-[min(840px,84vh)] sm:w-[400px] sm:rounded-[3rem] sm:border-[10px] sm:border-[#14100D] sm:shadow-[0_60px_120px_-40px_rgba(35,31,30,0.5)]">
            <RutinaApp />
          </div>
        </div>
      </main>
    </div>
  )
}
