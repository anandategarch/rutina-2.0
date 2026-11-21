import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/* ===== Tipografi kustom × tailwind-merge (perbaikan v2.53) =====
   Tailwind hanya mengenal utilitas ukuran bawaan (text-sm, text-lg,
   text-[10px], …). Token ukuran kustom Rutina (text-chart-label,
   text-note, text-kpi, dst.) tidak dikenalnya, sehingga twMerge
   menggolongkannya sebagai WARNA TEKS — lalu menghapusnya bila di-merge
   bersama kelas warna (cn('text-note', 'text-content-muted') ⇒ ukuran
   hilang senyap, teks jatuh ke 16px warisan; penyebab label "Ruang
   Suasana" saling menumpuk di ponsel). Daftarkan seluruh token ukuran
   kustom (statis --text-* + fluid @utility) ke grup font-size agar
   hidup berdampingan dengan kelas warna, dan tetap saling menggantikan
   satu sama lain secara benar (cn('text-note','text-body') ⇒ text-body). */
const twMergeCustom = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-chart-label",
        "text-eyebrow",
        "text-meta",
        "text-note",
        "text-body",
        "text-section",
        "text-section-lg",
        "text-lead",
        "text-kpi-sm",
        "text-kpi",
        "text-kpi-lg",
        "text-kpi-hero",
        "text-fluid-hero",
        "text-fluid-title",
        "text-fluid-body",
        "text-fluid-page",
        "text-fluid-editorial",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMergeCustom(clsx(inputs))
}
