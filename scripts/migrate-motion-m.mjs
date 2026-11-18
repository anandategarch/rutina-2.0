/**
 * Skrip sekali-jalan: migrasi <motion.X> → <m.X> untuk LazyMotion.
 * - Mengganti tag JSX motion.* menjadi m.*
 * - Menata ulang impor: `motion` keluar dari 'motion/react',
 *   `m` masuk dari 'motion/react-m'.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'src'

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

const files = walk(ROOT)
let touched = 0

for (const file of files) {
  let src = readFileSync(file, 'utf8')
  if (!src.includes('<motion.') && !src.includes('</motion.')) continue

  // 1) Ganti tag JSX
  src = src.replace(/<\/motion\./g, '</m.')
  src = src.replace(/<motion\./g, '<m.')

  // 2) Tata ulang impor 'motion/react'
  const importRe = /import\s*\{([^}]*)\}\s*from\s*'motion\/react'/g
  let needsMImport = true
  src = src.replace(importRe, (full, names) => {
    const specs = names
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const rest = specs.filter((s) => s !== 'motion')
    const mImport = "import * as m from 'motion/react-m'"
    if (rest.length === 0) {
      // Impor lama hanya berisi `motion` → ganti langsung menjadi impor m
      needsMImport = false
      return mImport
    }
    // Pertahankan sisa impor, lalu sisipkan impor m setelahnya
    needsMImport = false
    const wasMultiline = full.includes('\n')
    const rebuilt = wasMultiline
      ? `import {\n  ${rest.join(',\n  ')},\n} from 'motion/react'`
      : `import { ${rest.join(', ')} } from 'motion/react'`
    return rebuilt + '\n' + mImport
  })

  // 3) Bila tidak ada impor motion/react yang tersisa (mis. hanya type),
  //    sisipkan impor m setelah 'use client'
  if (needsMImport && !src.includes("from 'motion/react-m'")) {
    if (src.startsWith("'use client'\n")) {
      src = src.replace(
        "'use client'\n",
        "'use client'\n\nimport * as m from 'motion/react-m'\n",
      )
    } else {
      src = "import * as m from 'motion/react-m'\n" + src
    }
  }

  writeFileSync(file, src)
  touched++
  console.log('migrated:', file)
}

console.log(`\n${touched} file dimigrasi ke m.*`)
