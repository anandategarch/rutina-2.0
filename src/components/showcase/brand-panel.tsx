'use client'

import { motion } from 'motion/react'
import { MonitorSmartphone } from 'lucide-react'

import { playfair } from '@/components/rutina-mobile/serif'

const EASE = [0.22, 1, 0.36, 1] as const

/* ===== Data palet — lima token earth tone ===== */

const SWATCHES = [
  {
    name: 'Matcha',
    hex: '#749B58',
    role: 'Aksen 10%',
    swatch: 'bg-[#749B58]',
  },
  {
    name: 'Pistachio',
    hex: '#E4EFE0',
    role: 'Sekunder 30%',
    swatch: 'bg-[#E4EFE0]',
  },
  {
    name: 'Warm Sand',
    hex: '#F5F3EE',
    role: 'Dasar 60%',
    swatch: 'bg-[#F5F3EE]',
  },
  {
    name: 'Espresso',
    hex: '#4A3B32',
    role: 'Ikon & kartu gelap',
    swatch: 'bg-[#4A3B32]',
  },
  {
    name: 'Deep Espresso',
    hex: '#231F1E',
    role: 'Teks utama',
    swatch: 'bg-[#231F1E]',
  },
]

/* ===== Kartu pilar dengan diagram mini ===== */

function PillarCard({
  index,
  kicker,
  title,
  desc,
  delay = 0,
  className = '',
  children,
}: {
  index: string
  kicker: string
  title: string
  desc: string
  delay?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-24px' }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      whileHover={{ y: -3 }}
      className={`flex flex-col rounded-[20px] border border-[#4A3B3214] bg-[#F5F3EE] p-5 transition-shadow duration-300 hover:shadow-[0_10px_24px_rgba(74,59,50,0.10)] ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`${playfair.className} text-sm italic text-[#749B58]`}
        >
          {index}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4A3B32]/50">
          {kicker}
        </span>
      </div>
      <h3 className="mt-1 min-h-[42px] text-[15px] font-bold leading-snug tracking-tight text-[#231F1E]">
        {title}
      </h3>
      <div className="mt-4 flex-1">{children}</div>
      <p className="mt-4 text-[13px] leading-relaxed text-[#4A3B32]/75">
        {desc}
      </p>
    </motion.article>
  )
}

/* ===== Panel kiri — narasi merek & sistem desain ===== */

export function BrandPanel() {
  return (
    <div className="relative hidden w-full lg:block lg:h-dvh lg:w-1/2">
      <aside
        aria-label="Panel narasi desain Rutina"
        className="flex h-full w-full flex-col overflow-y-auto border-r border-[#4A3B3214] bg-white no-scrollbar"
      >
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-10 py-12 xl:px-14">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-[11px] font-bold uppercase tracking-[0.38em] text-[#4A3B32]/50"
        >
          PRD — Pratinjau Desain · v2.0
        </motion.p>

        {/* Wordmark + tagline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
          className={`${playfair.className} mt-4 text-[68px] font-semibold leading-none tracking-tight text-[#231F1E]`}
        >
          rutina<span className="text-[#749B58]">.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
          className={`${playfair.className} mt-3 text-[22px] italic leading-snug text-[#4A3B32]`}
        >
          Ritme kecil, hidup yang tenang.
        </motion.p>

        {/* Lead */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
          className="mt-5 max-w-md text-[15px] leading-relaxed text-[#4A3B32]/80"
        >
          Satu halaman, empat pilar: palet earth tone yang menenangkan,
          komposisi split screen, dasbor bento grid, dan tipografi editorial.
          Ponsel di sebelah kanan bukan gambar — centang tugasnya, tulis
          catatannya, rasakan gerakannya. Pil di atasnya membalik kanvas:
          cobalah varian <span className="font-bold">Gamified</span> (Espresso)
          dan <span className="font-bold">Clean</span> (Matcha).
        </motion.p>

        {/* Bento prinsip */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="mt-10 text-[13px] font-bold uppercase tracking-[0.16em] text-[#4A3B32]"
        >
          Empat Pilar Sistem
        </motion.p>

        <div className="mt-3 grid grid-cols-2 gap-4 xl:grid-cols-3">
          {/* 01 — Split Screen */}
          <PillarCard
            index="01"
            kicker="Layout"
            title="Split Screen"
            desc="Kiri narasi, kanan produk — dua panel setara yang menyatu dalam satu bingkai, masing-masing menggulir mandiri."
          >
            <div className="flex h-20 gap-2" aria-hidden="true">
              <div className="flex flex-1 flex-col justify-center gap-1.5 rounded-xl bg-[#E4EFE0] p-3">
                <span className="h-1.5 w-3/5 rounded-full bg-[#4A3B32]/30" />
                <span className="h-1.5 w-4/5 rounded-full bg-[#4A3B32]/20" />
                <span
                  className={`${playfair.className} text-lg italic leading-none text-[#4A3B32]`}
                >
                  Aa
                </span>
              </div>
              <div className="flex flex-1 items-center justify-center rounded-xl bg-[#749B58] p-3">
                <span className="h-full w-1/2 rounded-lg bg-[#FAF9F6]/85" />
              </div>
            </div>
          </PillarCard>

          {/* 02 — Bento Grid */}
          <PillarCard
            index="02"
            kicker="Grid"
            title="Bento Grid"
            desc="Kartu-kartu modular dengan lebar campuran — ringkasan, statistik, dan aksi tersusun dalam satu ritme visual."
            delay={0.05}
          >
            <div
              className="grid h-20 grid-cols-2 gap-2"
              aria-hidden="true"
            >
              <span className="rounded-xl bg-[#749B58]" />
              <span className="rounded-xl bg-[#E4EFE0]" />
              <span className="col-span-2 rounded-xl bg-[#4A3B32]" />
            </div>
          </PillarCard>

          {/* 03 — Tipografi */}
          <PillarCard
            index="03"
            kicker="Type"
            title="Tipografi Editorial"
            desc="Playfair Display untuk judul & kutipan, Geist untuk antarmuka — serif bertemu sans dalam skala yang tegas."
            delay={0.1}
            className="col-span-2 xl:col-span-1"
          >
            <div className="flex h-20 items-center gap-4" aria-hidden="true">
              <span
                className={`${playfair.className} text-[52px] font-semibold italic leading-none text-[#231F1E]`}
              >
                Aa
              </span>
              <span className="text-[52px] font-semibold leading-none tracking-tight text-[#4A3B32]/35">
                Aa
              </span>
            </div>
          </PillarCard>

          {/* 04 — Palet warna */}
          <PillarCard
            index="04"
            kicker="Tokens"
            title="Palet Earth Tone"
            desc="Lima token bumi dengan aturan 60–30–10: sand sebagai dasar, pistachio sebagai lapisan, matcha sebagai aksen."
            delay={0.15}
            className="col-span-2 bg-white"
          >
            <div className="mt-1 grid grid-cols-5 gap-2">
              {SWATCHES.map((s) => (
                <div key={s.name} className="flex flex-col gap-1.5">
                  <span
                    aria-hidden="true"
                    className={`h-10 w-full rounded-xl border border-[#4A3B3214] ${s.swatch}`}
                  />
                  <span className="text-[10px] font-bold leading-tight text-[#231F1E]">
                    {s.name}
                  </span>
                  <span className="text-[9px] font-medium leading-tight text-[#4A3B32]/55">
                    {s.hex}
                  </span>
                  <span className="text-[9px] font-medium leading-tight text-[#4A3B32]/70">
                    {s.role}
                  </span>
                </div>
              ))}
            </div>
          </PillarCard>

          {/* 05 — Spesimen */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            whileHover={{ y: -3 }}
            className="col-span-2 flex flex-col rounded-[20px] bg-[#4A3B32] p-5 text-[#F5F3EE] transition-shadow duration-300 hover:shadow-[0_10px_24px_rgba(35,31,30,0.25)] xl:col-span-1"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#F5F3EE]/50">
              Spesimen
            </span>
            <p
              className={`${playfair.className} mt-3 text-[34px] font-semibold italic leading-none`}
            >
              Aa
            </p>
            <p
              className={`${playfair.className} mt-3 text-[13px] italic leading-relaxed text-[#F5F3EE]/90`}
            >
              &ldquo;Ritme kecil, hidup yang tenang.&rdquo;
            </p>
            <p className="mt-auto pt-4 text-[11px] font-medium leading-relaxed text-[#F5F3EE]/65">
              Geist — teks &amp; antarmuka, 0123456789
            </p>
          </motion.article>
        </div>

        {/* Hint mode satu layar */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-10 flex items-start gap-3 rounded-[16px] border border-[#749B5833] bg-[#E4EFE0]/60 p-4"
        >
          <MonitorSmartphone
            className="mt-0.5 h-4 w-4 shrink-0 text-[#4A3B32]"
            strokeWidth={1.8}
          />
          <p className="text-left text-[13px] leading-relaxed text-[#4A3B32]">
            <span className="font-bold">Mode satu layar:</span> perkecil
            jendela di bawah 1024px — panel ini melipat dan aplikasi mengisi
            seluruh layar, persis seperti di perangkat nyata.
          </p>
        </motion.div>

        {/* Footer panel */}
        <footer className="mt-auto pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#4A3B3214] pt-5">
            <p className="text-xs font-medium text-[#4A3B32]/60">
              shadcn/ui · Tailwind CSS 4 · Motion · anime.js
            </p>
            <p className="text-xs font-medium text-[#4A3B32]/60">
              PRD lengkap — docs/PRD.md
            </p>
          </div>
        </footer>
      </div>
      </aside>

      {/* Afiliasi gulir: gradasi lembut menutup tepi bawah panel kiri */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-white to-transparent"
      />
    </div>
  )
}
