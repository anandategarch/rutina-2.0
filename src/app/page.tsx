import { RutinaApp } from '@/components/rutina-mobile/rutina-app'

export default function Page() {
  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center gap-6 overflow-hidden bg-[#F5F3EE] sm:py-10">
      {/* Cahaya ambien lembut di latar (mode desktop) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[#E4EFE0]/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-[#749B58]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EAE5D9]/50 blur-3xl"
      />

      <p className="hidden text-[11px] font-bold uppercase tracking-[0.38em] text-[#4A3B32]/50 sm:block">
        Rutina — Pratinjau Aplikasi Mobile
      </p>

      {/* Bingkai ponsel di desktop; layar penuh di perangkat mobile */}
      <div className="relative h-dvh w-full overflow-hidden bg-[#F5F3EE] sm:h-[min(840px,84vh)] sm:w-[400px] sm:rounded-[3rem] sm:border-[10px] sm:border-[#14100D] sm:shadow-[0_60px_120px_-40px_rgba(35,31,30,0.5)]">
        <RutinaApp />
      </div>
    </main>
  )
}
