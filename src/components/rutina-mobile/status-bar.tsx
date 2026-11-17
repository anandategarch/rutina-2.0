'use client'

import { useEffect, useState } from 'react'
import { BatteryFull, Signal, Wifi } from 'lucide-react'

/** Bar status ala iOS — hanya tampil saat app berada dalam bingkai ponsel (sm+). */
export function StatusBar() {
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
    <div className="hidden h-11 shrink-0 items-center justify-between bg-[#F5F3EE] px-7 pt-1 sm:flex">
      <span className="text-[13px] font-semibold tabular-nums text-[#231F1E]">
        {time || '09.41'}
      </span>
      <span className="flex items-center gap-1.5 text-[#231F1E]">
        <Signal className="h-[14px] w-[14px]" strokeWidth={2.2} />
        <Wifi className="h-[14px] w-[14px]" strokeWidth={2.2} />
        <BatteryFull className="h-4 w-4" strokeWidth={2} />
      </span>
    </div>
  )
}
