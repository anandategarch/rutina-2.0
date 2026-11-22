'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { cn } from '@/lib/utils'

/* CSS resmi Lenis: kelas .lenis (scroll-behavior dipaksa auto saat
   smoothing aktif, overscroll-contain untuk [data-lenis-prevent]). */
import 'lenis/dist/lenis.css'

/* ScrollTrigger didaftarkan sekali per modul (idempoten). */
gsap.registerPlugin(ScrollTrigger)

/**
 * SmoothScrollArea — fondasi gulir halus Rutina (v2.87).
 *
 * Arsitektur: aplikasi TIDAK memakai gulir window — tiap layar punya
 * wadah overflow sendiri (cangkang h-dvh overflow-hidden, app-frame).
 * Karena itu Lenis dipasang PER-WADAH (opsi wrapper/content), bukan di
 * window — satu instance per layar, hidup-mati mengikuti mount layar.
 *
 * Integrasi mengikuti resep resmi Lenis × GSAP ScrollTrigger:
 *   1. lenis.on('scroll', ScrollTrigger.update) — pemicu sinkron
 *      dengan setiap frame smoothing.
 *   2. lenis.raf digerakkan gsap.ticker (bukan rAF sendiri) sehingga
 *      tween GSAP dan gulir Lenis berbagi SATU detak waktu.
 *   3. gsap.ticker.lagSmoothing(0) — jangan "mengejar" lag virtual.
 *
 * Anak di dalam area bisa membuat ScrollTrigger dengan scroller dari
 * useSmoothScroller() — konteks membagikan ref wadah (stabil, terisi
 * sebelum effect anak berjalan) + instance Lenis untuk scrollTo halus.
 *
 * Aksesibilitas & sentuhan:
 *   - prefers-reduced-motion → TANPA Lenis (gulir native); ScrollTrigger
 *     anak memutuskan sendiri (WordReveal langsung statis).
 *   - syncTouch tetap mati (bawaan Lenis): gulir sentuh tetap native
 *     di ponsel — momentum iOS dijaga, animasi tetap terpicu lewat
 *     event scroll native.
 *
 * Konten async (sinkronisasi data pasca-mount mengubah tinggi) dijaga
 * dengan ResizeObserver → ScrollTrigger.refresh() ter-debounce.
 */
export interface SmoothScrollerContextValue {
  /** Elemen wadah gulir (overflow-y-auto) — scroller untuk ScrollTrigger. */
  wrapperRef: RefObject<HTMLDivElement | null>
  /** Instance Lenis aktif (null bila reduced-motion). */
  lenisRef: RefObject<Lenis | null>
}

const SmoothScrollerContext = createContext<SmoothScrollerContextValue | null>(
  null,
)

/** Ambil wadah gulir halus terdekat (null di luar SmoothScrollArea). */
export function useSmoothScroller(): SmoothScrollerContextValue | null {
  return useContext(SmoothScrollerContext)
}

export interface SmoothScrollAreaProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: ReactNode
  /** Kelas tambahan untuk wadah gulir (mis. overscroll-contain, max-w). */
  className?: string
  /** Kelas untuk lapisan konten di dalam (padding, ritme antar-blok). */
  contentClassName?: string
  style?: CSSProperties
  /** Ref ke wadah gulir — untuk useScroll/scrollTo pemanggil. */
  viewportRef?: RefObject<HTMLDivElement | null>
}

export function SmoothScrollArea({
  children,
  className,
  contentClassName,
  style,
  viewportRef,
  ...props
}: SmoothScrollAreaProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const content = contentRef.current
    if (!wrapper || !content) return

    /* Reduced-motion: Lenis adalah gerak — penggemar ketenangan
       mendapat gulir native murni (ScrollTrigger tetap bekerja). */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const lenis = new Lenis({
      wrapper,
      content,
      /* rAF digerakkan gsap.ticker di bawah — bukan rAF internal. */
      autoRaf: false,
      /* Interpolasi 0,12 — sapuan halus yang tetap sigap; khas
         aplikasi produktif (bukan landing page lambat). */
      lerp: 0.12,
    })
    lenisRef.current = lenis

    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)

    const raf = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    /* Tinggi konten berubah pasca-mount (data sinkronisasi, daftar
       dimuat) — posisi pemicu ScrollTrigger harus dihitung ulang.
       Debounce 160ms agar refresh tidak beruntun tiap baris data. */
    let refreshTimer: number | undefined
    const ro = new ResizeObserver(() => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        ScrollTrigger.refresh()
      }, 160)
    })
    ro.observe(content)

    return () => {
      window.clearTimeout(refreshTimer)
      ro.disconnect()
      gsap.ticker.remove(raf)
      lenis.off('scroll', onScroll)
      lenis.destroy()
      if (lenisRef.current === lenis) lenisRef.current = null
    }
  }, [])

  return (
    <div
      ref={(node) => {
        wrapperRef.current = node
        if (viewportRef) viewportRef.current = node
      }}
      className={cn('h-full overflow-y-auto no-scrollbar', className)}
      style={style}
      {...props}
    >
      <SmoothScrollerContext.Provider value={{ wrapperRef, lenisRef }}>
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </SmoothScrollerContext.Provider>
    </div>
  )
}
