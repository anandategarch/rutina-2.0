'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { CONTENT_W } from '../layout-widths'
import { useRutina } from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { formatIDR, formatIDRShort } from './utils'

/* ================================================================= */
/* Lembar "isi tabungan" — slider + tombol cepat.                     */
/* ================================================================= */

const QUICK = [50_000, 100_000, 250_000, 500_000, 1_000_000]

const quickLabel = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString('id-ID')} jt` : `${v / 1000} rb`

export function ContributeGoalSheet() {
  const goalSheetId = useRutina((s) => s.goalSheetId)
  const closeGoalSheet = useRutina((s) => s.closeGoalSheet)
  const contributeGoal = useRutina((s) => s.contributeGoal)
  const goals = useRutina((s) => s.goals)

  const goal = goals.find((g) => g.id === goalSheetId) ?? null
  const [amount, setAmount] = useState(100_000)
  const [prevId, setPrevId] = useState<string | null>(null)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  /* Focus management: fokus awal, trap Tab, kembalikan fokus saat tutup. */
  useFocusTrap(Boolean(goal), panelRef)

  /* Reset draf tiap kali target lembar berganti. */
  if (goalSheetId !== prevId) {
    setPrevId(goalSheetId)
    if (goalSheetId) setAmount(100_000)
  }

  useEffect(() => {
    if (!goalSheetId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGoalSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goalSheetId, closeGoalSheet])

  const open = Boolean(goal)
  const complete = goal ? goal.saved >= goal.target : false
  const after = goal ? Math.min(goal.target, goal.saved + amount) : 0
  const afterPct = goal ? Math.min(100, Math.round((after / goal.target) * 100)) : 0
  const beforePct = goal ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0

  const submit = () => {
    if (!goal || complete) return
    contributeGoal(goal.id, amount)
    closeGoalSheet()
    if (goal.saved + amount >= goal.target) {
      toast.success(`Target "${goal.name}" tercapai — tabungan lengkap!`)
    } else {
      toast.success(`${formatIDR(amount)} masuk ke "${goal.name}"`)
    }
  }

  return (
    <AnimatePresence>
      {open && goal && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeGoalSheet}
            className="absolute inset-0 z-40 bg-espresso/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <m.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-label={`Isi tabungan ${goal.name}`}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) closeGoalSheet()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto w-full rounded-t-[28px] bg-surface-primary px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 ${CONTENT_W}`}
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-cocoa/15" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <h2 className="text-lg font-semibold tracking-tight text-content-primary">
                  Isi Tabungan
                </h2>
                <p className="mt-0.5 text-[13px] text-content-muted">
                  {goal.name} · target {formatIDRShort(goal.target)}
                </p>
              </div>
              {complete ? (
                <Badge className="border-transparent bg-pistachio/30 text-success hover:bg-pistachio/30">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Tercapai
                </Badge>
              ) : null}
            </div>

            {complete ? (
              <p className="mt-6 rounded-2xl bg-secondary px-4 py-5 text-center text-[13px] font-medium text-success">
                Target sudah tercapai — {formatIDR(goal.saved)} terkumpul.
                Waktunya menetapkan tujuan berikutnya.
              </p>
            ) : (
              <>
                {/* Nilai terpilih */}
                <div className="mt-4 text-center">
                  <span className="text-[34px] font-bold leading-none tabular-nums text-success">
                    {formatIDR(amount)}
                  </span>
                  <p className="mt-1 text-[11px] text-content-muted">
                    geser atau pilih nominal cepat
                  </p>
                </div>

                {/* Slider */}
                <Slider
                  value={[amount]}
                  onValueChange={(v) => setAmount(v[0] ?? 10_000)}
                  min={10_000}
                  max={2_000_000}
                  step={10_000}
                  aria-label="Nominal tabungan"
                  className="mt-4 [&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-action-hover [&_[data-slot=slider-thumb]]:bg-secondary"
                />

                {/* Tombol cepat */}
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {QUICK.map((q) => {
                    const on = amount === q
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(q)}
                        aria-pressed={on}
                        className={`h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-[12px] font-bold transition-colors active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          on
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-surface-sunken text-content-secondary hover:bg-secondary'
                        }`}
                      >
                        {quickLabel(q)}
                      </button>
                    )
                  })}
                </div>

                {/* Pratinjau setelah menabung */}
                <div className="mt-4 rounded-2xl bg-surface-sunken px-4 py-3.5 text-left">
                  <div className="flex items-baseline justify-between text-[12px] text-content-muted">
                    <span>Perkiraan tabungan</span>
                    <span className="font-bold tabular-nums text-content-primary">
                      {formatIDRShort(after)} · {afterPct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                    <m.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-pistachio"
                      initial={false}
                      animate={{ width: `${afterPct}%` }}
                      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-content-muted">
                    dari {beforePct}% sekarang — naik {afterPct - beforePct} poin
                  </p>
                </div>
              </>
            )}

            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeGoalSheet}
                className="h-11 flex-1 rounded-full font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
              >
                Batal
              </Button>
              {!complete && (
                <Button
                  type="button"
                  onClick={submit}
                  className="h-11 flex-1 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-action-hover"
                >
                  Tabung {formatIDRShort(amount)}
                </Button>
              )}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ================================================================= */
/* Dialog "tujuan baru" — shadcn Dialog.                              */
/* ================================================================= */

const MIN_TARGET = 100_000

export function NewGoalDialog() {
  const goalDialogOpen = useRutina((s) => s.goalDialogOpen)
  const closeGoalDialog = useRutina((s) => s.closeGoalDialog)
  const addGoal = useRutina((s) => s.addGoal)

  const [name, setName] = useState('')
  const [targetDigits, setTargetDigits] = useState('')
  const [prevOpen, setPrevOpen] = useState(false)

  if (goalDialogOpen !== prevOpen) {
    setPrevOpen(goalDialogOpen)
    if (goalDialogOpen) {
      setName('')
      setTargetDigits('')
    }
  }

  const target = Number(targetDigits || '0')

  const setTarget = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 10)
    setTargetDigits(digits)
  }

  const submit = () => {
    const n = name.trim()
    if (!n) {
      toast.warning('Beri nama dulu tujuannya')
      return
    }
    if (target < MIN_TARGET) {
      toast.warning(`Target minimal ${formatIDR(MIN_TARGET)}`)
      return
    }
    addGoal(n, target)
    closeGoalDialog()
    toast.success(`Tujuan "${n}" dibuat — mulai menabung!`)
  }

  return (
    <Dialog
      open={goalDialogOpen}
      onOpenChange={(o) => {
        if (!o) closeGoalDialog()
      }}
    >
      <DialogContent className="max-w-[400px] rounded-[28px] border-border bg-surface-primary p-6 text-content-primary">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-lg tracking-tight">
            <Sparkles className="h-5 w-5 text-success" />
            Tujuan Tabungan Baru
          </DialogTitle>
          <DialogDescription className="text-[13px] text-content-muted">
            Tetapkan nama dan target — cincin progresnya muncul di tab Keuangan.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal-name" className="text-[13px] font-semibold text-content-secondary">
              Nama tujuan
            </Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. DP rumah"
              maxLength={24}
              className="h-11 rounded-xl border-input bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-target" className="text-[13px] font-semibold text-content-secondary">
              Target <span className="font-normal text-content-muted">(min. Rp100 rb)</span>
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-content-muted">
                Rp
              </span>
              <Input
                id="goal-target"
                inputMode="numeric"
                value={targetDigits ? Number(targetDigits).toLocaleString('id-ID') : ''}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="5.000.000"
                className="h-11 rounded-xl border-input bg-surface-sunken pl-10 text-right tabular-nums text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={closeGoalDialog}
            className="h-11 flex-1 rounded-full font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={submit}
            className="h-11 flex-1 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-action-hover"
          >
            Buat Tujuan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
