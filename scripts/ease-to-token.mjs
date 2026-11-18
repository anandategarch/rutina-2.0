#!/usr/bin/env bun
/**
 * Skrip sekali-jalan: migrasi easing inline `[0.22, 1, 0.36, 1]`
 * ke token governance `motionTokens.easing.standard`.
 *
 * - Mengganti SEMUA kemunculan pola easing pada file target.
 * - Menambahkan import motionTokens bila belum ada (setelah baris
 *   import terakhir).
 * - Idempoten: dijalankan berulang pun aman.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const files = process.argv.slice(2)
const EASE_INLINE = /\[0\.22,\s*1,\s*0\.36,\s*1\]/g
const IMPORT_RE =
  /^import\s+[^\n]*?from\s+['"][^'"]+['"];?\s*$/gm

let totalRepl = 0
let filesTouched = 0

for (const f of files) {
  let src = readFileSync(f, 'utf8')
  const matches = src.match(EASE_INLINE)
  if (!matches) continue

  const count = matches.length
  src = src.replace(EASE_INLINE, 'motionTokens.easing.standard')

  // Perlu memastikan hanya konteks `ease:` yang terganti? Pola tuple ini
  // spesifik untuk kurva standar Rutina; pemakaian lain sangat kecil
  // kemungkinannya — kita cek konteksnya dulu.
  let srcChecked = readFileSync(f, 'utf8').replace(
    /(ease:\s*)\[0\.22,\s*1,\s*0\.36,\s*1\]/g,
    '$1motionTokens.easing.standard',
  )
  const countChecked = (
    readFileSync(f, 'utf8').match(/ease:\s*\[0\.22,\s*1,\s*0\.36,\s*1\]/g) ?? []
  ).length

  if (countChecked !== count) {
    // Ada kemunculan di luar konteks `ease:` — pakai versi konservatif.
    src = srcChecked
    totalRepl += countChecked
  } else {
    totalRepl += count
  }

  if (!/motionTokens/.test(src.split('\n')[0] + src)) {
    // belum ada referensi token sama sekali → tambah import
  }
  if (!/import\s*\{[^}]*motionTokens[^}]*\}\s*from/.test(src)) {
    // sisipkan setelah baris import terakhir
    let lastEnd = 0
    for (const m of src.matchAll(IMPORT_RE)) {
      lastEnd = Math.max(lastEnd, (m.index ?? 0) + m[0].length)
    }
    if (lastEnd === 0) {
      console.error(`  ${f}: tidak ada baris import — dilewati`)
      continue
    }
    src =
      src.slice(0, lastEnd) +
      `\nimport { motionTokens } from '@/lib/motion/tokens'` +
      src.slice(lastEnd)
  }

  writeFileSync(f, src)
  filesTouched++
  console.log(`  ${f}: ${countChecked !== count ? countChecked : count} easing → token`)
}

console.log(`\nSelesai: ${filesTouched} file, ${totalRepl} penggantian.`)
