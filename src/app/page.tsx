import { BrandPanel } from '@/components/showcase/brand-panel'
import { PreviewStage } from '@/components/showcase/preview-stage'

export default function Page() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-white lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* Panel kiri — narasi & sistem desain (hanya desktop) */}
      <BrandPanel />

      {/* Panel kanan — panggung preview ponsel interaktif + penjelajah varian */}
      <PreviewStage />
    </div>
  )
}
