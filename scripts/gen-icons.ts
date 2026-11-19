/**
 * gen-icons.ts — regenerasi aset logo & ikon Rutina (v2.15).
 *
 * Konsep baru “r tunas”: huruf r lowercase yang digambar SATU goresan
 * menerus — batang tegak (rutinitas), bahu melengkung (ritme harian) —
 * dan di ujung bahu tumbuh satu daun (tunas = pertumbuhan). Menggantikan
 * logo lama (kotak gelap + huruf Z; ikon gradien emerald + kecambah)
 * sepenuhnya: bentuk, warna, dan karakter berbeda dari versi lama.
 *
 * Marka dibangun dari geometri murni (grid 140×140):
 *   - Goresan r: M58 124 V72 A32 32 0 0 1 90 40
 *       batang x58 y72..124, bahu = busur 90° pusat (90,72) radius 32,
 *       berakhir pukul-12 dengan tutup bundar r6 (stroke 12, cap round).
 *   - Daun: sengaja MELAYANG — pangkal chord (88,32)-(102,32) mengapung
 *       ±3px di atas ujung bahu (celah disengaja: terminal goresan bersih,
 *       daun tumbuh melampauinya); perut ±19, ujung daun (117,12) arah 42°
 *       kanan-atas; dua kurva kuadratik simetris terhadap sumbu daun.
 *   - Digeser translate(-14.6,1.8) agar pusat optis tepat (70,70);
 *     skala per-aset: logo 100%, ikon 80%, maskable 46% (zona aman).
 *
 * Keluaran (semua ditimpa):
 *   public/logo.svg                   — marka matcha, latar transparan
 *   public/icons/icon.svg             — kotak sudut-bulat matcha + marka parchment
 *   public/icons/icon-512.png         — 512×512
 *   public/icons/icon-192.png         — 192×192
 *   public/icons/apple-touch-icon.png — 180×180
 *   public/icons/maskable-512.png     — full-bleed, marka 47%
 *
 * Pemakaian: bun scripts/gen-icons.ts
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ICON_DIR = join(ROOT, 'public', 'icons')

/* ===== Palet — selaras token globals.css & manifest ===== */
const MATCHA = '#749b58' // jangkar merek (theme_color PWA)
const PARCHMENT = '#faf9f6' // krem kanvas terang

/* ===== Geometri marka (grid 140) ===== */
const R_STROKE =
  'M58 124 V72 A32 32 0 0 1 90 40' /* batang + bahu, satu goresan */
const LEAF =
  'M88 32 Q96.8 7.9 117.3 11.9 Q115.2 36.3 102 32 Z' /* daun melayang ujung bahu */
const MARK_SHIFT = 'translate(-14.6 1.8)' /* pusat optis → (70,70) */

/** Grup marka: goresan r (stroke 12, cap bundar) + daun (isi).
 *  `scale` menskalakan terhadap titik tengah kanvas (70,70). */
function markGroup(color: string, scale = 1): string {
  const t =
    scale === 1
      ? ''
      : `translate(70 70) scale(${scale}) translate(-70 -70) `
  return `<g transform="${t}${MARK_SHIFT}">
<path d="${R_STROKE}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/>
<path d="${LEAF}" fill="${color}"/>
</g>`
}

/** SVG ikon pada ukuran tertentu. rx=0 untuk maskable (full-bleed). */
function iconSvg(size: number, markScale: number, rx: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 140 140">
<rect width="140" height="140" rx="${rx}" fill="${MATCHA}"/>
${markGroup(PARCHMENT, markScale)}
</svg>`
}

async function renderPng(svg: string, file: string): Promise<void> {
  await sharp(Buffer.from(svg)).png().toFile(file)
  const meta = await sharp(file).metadata()
  console.log(`  ${file} -> ${meta.width}x${meta.height} (${meta.format})`)
}

mkdirSync(ICON_DIR, { recursive: true })
console.log('[gen-icons] Marka “r tunas” v2.15 (goresan tunggal + daun) — menulis aset…')

/* logo.svg — marka matcha tanpa latar (README/dokumentasi) */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">
${markGroup(MATCHA)}
</svg>
`
await sharp(Buffer.from(LOGO_SVG)).toFile(join(ROOT, 'public', 'logo.svg'))
console.log('  public/logo.svg ditulis')

/* icon.svg — vector */
await sharp(Buffer.from(iconSvg(140, 0.8, 40))).toFile(join(ICON_DIR, 'icon.svg'))
console.log('  public/icons/icon.svg ditulis')

/* PNG — tiap ukuran dirender dari SVG resolusi aslinya */
await renderPng(iconSvg(512, 0.8, 40), join(ICON_DIR, 'icon-512.png'))
await renderPng(iconSvg(192, 0.8, 40), join(ICON_DIR, 'icon-192.png'))
await renderPng(iconSvg(180, 0.8, 40), join(ICON_DIR, 'apple-touch-icon.png'))
/* Maskable: full-bleed tanpa sudut, marka 46% (aman di zona 80%) */
await renderPng(iconSvg(512, 0.46, 0), join(ICON_DIR, 'maskable-512.png'))

console.log('[gen-icons] Selesai — logo, ikon PWA & apple-touch diganti.')
