'use client'

import * as m from 'motion/react-m'

import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'

/**
 * InkStroke / InkDot — "aliran tinta" volume kata per pekan (Jurnal,
 * Warm Editorial P2.0 · Quiet Atelier).
 *
 * Batang kata polos diganti sapuan kuas: satu path tinta vertikal yang
 * ramping di ujung atas, mengembang penuh mendekati dasar, dengan tepi
 * bezier kembar yang sedikit bergelombang (organik, bukan mesin) dan
 * ujung bawah membulat lembut. TINTA MENGENDAP digambarkan elips gelap
 * tipis di dasar tiap sapuan non-nol.
 *
 * Kejujuran pembacaan angka dijaga: TINGGI LUAR sapuan tetap persis
 * tinggi nilai (`words/max*100`, min 10%) — taper hanya menyempitkan
 * lebar bagian atas, tidak pernah menggeser puncak. viewBox 24×100
 * direnggangkan `preserveAspectRatio="none"` agar tepi luar atas-bawah
 * melekat tepat pada kotak nilai.
 *
 * Presentasional murni: label aria nilai dibawa tombol di pemanggil
 * (screens/journal.tsx); SVG di sini aria-hidden.
 */

/** Bentuk sapuan tinta — ujung atas sempit (±4.8 unit), dasar penuh
 *  (±8 unit) dengan tepi kiri-kanan bercermin asimetris halus + dasar
 *  membulat. Koordinat y 0..100 = tinggi penuh kotak nilai. */
const INK_PATH =
  'M9.6 0 C8.2 15 5.6 32 4.9 50 C4.3 66 4.1 80 4.05 92 ' +
  'C4.02 96.8 5.9 100 9.6 100 L14.4 100 ' +
  'C18.1 100 19.98 96.8 19.95 92 C19.9 80 19.55 64 18.9 48 ' +
  'C18.1 30 15.8 13 14.4 0 Z'

/** Gerbang anti-replay dipasang PER-INSTANCE di sini (bukan di kartu
 *  pemanggil): mode 'kata' dipasang-ulang setiap kali pengguna berganti
 *  mode baca — gerbang di level kartu akan terbakar pada mode kalender
 *  sebelum sapuan tinta pernah tampil. Empat batang mount bersamaan
 *  dengan key yang sama sama-sama melihat kunjungan pertama (perilaku
 *  useFirstVisit yang terdokumentasi) → seluruh sapuan menyala serempak
 *  saat pertama kali, instan sesudahnya. */
export function InkStroke({
  /** 0–100 — tinggi luar sapuan (persentase tinggi slot). */
  heightPct,
  /** true = pekan berjalan: tinta penuh (module-accent-strong). */
  isCurrent,
  /** Opasitas gradasi usia untuk pekan lampau (0.5–0.75; muda lebih pekat). */
  ageOpacity,
  /** Batang terpilih (filter pekan aktif) — ring baku var(--primary). */
  selected,
  /** Jeda stagger masuk (detik) — pola `i * stagger.normal` pemanggil. */
  delay,
}: {
  heightPct: number
  isCurrent: boolean
  ageOpacity: number
  selected: boolean
  delay: number
}) {
  const play = useFirstVisit('journal-ink')

  return (
    <m.div
      initial={play ? { scaleY: 0 } : false}
      animate={{ scaleY: 1 }}
      transition={{
        duration: motionTokens.duration.enter,
        delay,
        ease: motionTokens.easing.standard,
      }}
      style={{ height: `${heightPct}%` }}
      className={
        'relative w-full origin-bottom ' +
        (selected
          ? 'rounded-md ring-2 ring-primary ring-offset-1 ring-offset-surface-primary'
          : '')
      }
    >
      {/* SVG diposisikan absolut di dalam kotak nilai: rasio intrinsic
          viewBox (24:100) tidak boleh menjadi tinggi min-content rantai
          flex — jika dibiarkan mengalir, sapuan "mendesak" baris h-24
          dan meluber ke atas kartu. */}
      <svg
        viewBox="0 0 24 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 block h-full w-full"
      >
        <path
          d={INK_PATH}
          fill={isCurrent ? 'var(--module-accent-strong)' : 'var(--module-accent)'}
          opacity={isCurrent ? 1 : ageOpacity}
        />
        {/* Tinta mengendap di dasar sapuan — dekoratif, selalu non-nol
            di pemanggil (sapuan nol memakai InkDot). */}
        <ellipse
          cx="12"
          cy="96.6"
          rx="8.8"
          ry="2.2"
          fill="var(--module-accent-strong)"
          opacity="0.25"
        />
      </svg>
    </m.div>
  )
}

/**
 * InkDot — pekan tanpa satu kata pun: setumpuk tinta kecil menunggu
 * (pengganti polos stub 4px; r≈2). Ukuran tetap 4px — BUKAN proporsi
 * data, karena nol memang bukan nilai.
 */
export function InkDot({ delay }: { delay: number }) {
  const play = useFirstVisit('journal-ink')

  return (
    <m.div
      initial={play ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        ...motionTokens.spring.snappy,
        delay,
      }}
      className="flex h-full w-full items-end justify-center"
    >
      <span
        aria-hidden="true"
        className="mb-px block h-1 w-1 rounded-full"
        style={{ backgroundColor: 'var(--module-accent)', opacity: 0.4 }}
      />
    </m.div>
  )
}
