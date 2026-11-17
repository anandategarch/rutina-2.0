'use client'

import { useEffect, useState } from 'react'
import { BatteryFull, Signal, Wifi } from 'lucide-react'

/** Nada warna bar status mengikuti tema varian layar. */
const TONES = {
  sand: 'bg-[#F5F3EE] text-[#231F1E]',
  espresso: 'bg-[#4A3B32] text-[#F5F3EE]',
  matcha: 'bg-[#749B58] text-[#FAF9F6]',
} as const

export type StatusTone = keyof typeof TONES

/** Bar status ala iOS — hanya tampil saat app berada dalam bingkai ponsel (sm+). */
export function StatusBar({ tone = 'sand' }: { tone?: StatusTone }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () =>
      setTime(
        new Intl.DateTimeFormat('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date()),
      )
    update()
    const id = setInterval(update, 15_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className={`hidden h-11 shrink-0 items-center justify-between px-7 pt-1 sm:flex ${TONES[tone]}`}
    >
      <span className="text-[13px] font-semibold tabular-nums">
        {time || '09.41'}
      </span>
      <span className="flex items-center gap-1.5">
        <Signal className="h-[14px] w-[14px]" strokeWidth={2.2} />
        <Wifi className="h-[14px] w-[14px]" strokeWidth={2.2} />
        <BatteryFull className="h-4 w-4" strokeWidth={2} />
      </span>
    </div>
  )
}
