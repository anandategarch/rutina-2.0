'use client'

import { motion } from 'motion/react'

/** Ilustrasi garis minimalis: matahari, bukit, dan tunas — sama dengan gaya Kartu Harian. */
export function HeroDoodle() {
  return (
    <motion.svg
      viewBox="0 0 140 140"
      aria-hidden="true"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      className="pointer-events-none absolute right-0 top-0 h-20 w-20 text-[#FAF9F6]/40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="98" cy="34" r="12" />
      <path d="M98 14v5M98 49v5M78 34h5M113 34h5" />
      <path d="M4 106q34-36 68 0" />
      <path d="M52 120q30-28 60 0" />
      <path d="M26 122v-10" />
      <path d="M26 112c-8-1-12-6-12-13 8 1 12 6 12 13z" />
      <path d="M26 112c8-1 12-6 12-13-8 1-12 6-12 13z" />
    </motion.svg>
  )
}
