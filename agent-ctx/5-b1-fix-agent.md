# Task 5-b1 — Fix Agent (Rutina 2.0 motion/a11y polish)

Scope: kebiasaan.tsx, heatmap.tsx, spend-heatmap.tsx, garden-tree.tsx,
plant-garden.tsx, task-row.tsx, weekly-recap-card.tsx (ONLY these).
Status: ALL 20 fixes applied. lint clean, `tsc --noEmit` exit 0.

## Key decisions (for later agents)

1. **kebiasaan 5 stagger lists + agenda % bar**: reused the existing
   screen-level gate `playEntrance = useFirstVisit('kebiasaan-garden')`
   (KebiasaanScreen line ~937) instead of adding 5 per-block keys —
   the gate is in scope for all lists and section headers already use
   it ("reuse if scoped correctly" branch of the instruction). Same
   pattern as journal.tsx:612. Bonus: conditional blocks that mount
   mid-session (e.g. "Selesai" list appearing after first completion)
   still get their functional entrance during the first screen
   instance, while tab-switch remounts stay instant.
2. **heatmap.tsx `visitKey` prop** (optional). `const first =
   useFirstVisit(visitKey)` (unconditional hook — safe with undefined),
   `const play = visitKey ? first : true`. Wave effect skip condition is
   now `!inView || reducedMotion || !play`; deps deliberately stay
   `[inView, reducedMotion]` (play is stable; exhaustive-deps is OFF in
   eslint config). NOTE: also added `|| !play` to the card's `animate`
   target — gating `initial` alone is ineffective because the hidden
   state lives in `animate` until inView flips (covert replay).
   Kebiasaan passes `visitKey="kebiasaan-heatmap"`; Stats (other agent)
   can pass its own key or keep legacy behavior.
3. **Anti-replay keys added**: 'kebiasaan-garden-tree' (garden-tree
   progress bar), 'garden-plant-section' (plant-garden, shared Home +
   Kebiasaan), 'garden-task-stepper' (task-row bar — per-block key; all
   rows mount together and see true simultaneously, per first-visit.ts
   semantics).
4. **Hit-slop** `relative before:absolute before:-inset-2
   before:content-['']` applied to: HabitCheck (kebiasaan, 32–36px),
   AgendaRow ± steppers, TaskRow checkbox (32px) + ± steppers. All
   ≥44px effective target now. Kept visual size unchanged.
5. **Bento gap**: kebiasaan split grid now `gap-[var(--layout-grid-gap)]`
   (mirrors RutinaBentoGrid; same contract as keuangan.tsx:2429).
6. **Heatmap cells 20px → 24px** (WCAG 2.5.8) in heatmap.tsx AND
   spend-heatmap.tsx. spend-heatmap row labels (Sen/Rab/Jum) also moved
   h-5 → h-6 — required to keep label rows aligned with cell rows
   (parallel flex column vs grid; cumulative 4px/row drift otherwise).
7. **garden-tree sway** now `motionTokens.preset.gardenSway`; rotate
   keyframes amplitude kept.
8. **weekly-recap-card**: rounded-xl → rounded-2xl, whileTap 0.94 → 0.96.
9. **task-row**: whileTap 0.985 → 0.97.
10. **kebiasaan scrollIntoView** respects `useReducedMotion()`
    (behavior 'auto' vs 'smooth'); whileTap 0.95 → 0.96.

## Verification
- `bun run lint` → clean (no output).
- `bunx tsc --noEmit` → exit 0, zero errors (whole project).
- dev.log → recompiles OK, no runtime errors.

Files touched: exactly the 7 in scope. No CRUD/data logic changed.
