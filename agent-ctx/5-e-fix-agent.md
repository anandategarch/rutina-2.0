# Task 5-e — Fix Agent (Rutina 2.0 final polish batch)

Agent: 5-e (Fix Agent). Status: DONE — `bun run lint` exit 0 (clean, no output),
`bunx tsc --noEmit` exit 0, dev.log clean (all recompiles OK, no runtime errors).

Scope respected: ONLY the six files listed. No other file touched. No data/CRUD logic
changed. No new packages/files (except this work record).

## Files changed

1. `src/components/rutina-mobile/screens/home.tsx`
2. `src/components/rutina-mobile/screens/bugar.tsx`
3. `src/components/rutina-mobile/screens/profile.tsx`
4. `src/components/rutina-mobile/fitness/workout-sheet.tsx`
5. `src/components/rutina-mobile/fitness/workout-session.tsx`
6. `src/components/rutina-mobile/fitness/barbell-tools.tsx`

## Fixes applied

### home.tsx
- **Bonus gift pop anti-replay (was ~L1188)**: `initial={{scale:0.4,opacity:0}}` →
  `initial={playEntrance ? {scale:0.4,opacity:0} : false}` — reuses the parent section's
  existing `useFirstVisit('home-daybook')` var (same component scope; no new hook needed).
- **Quote refresh a11y (was ~L1341–1370)**: the AnimatePresence `mode="wait"` block is now
  wrapped in a persistent `<div aria-live="polite">`. Attribute is on the PERSISTENT wrapper
  (not the keyed m.div) because a live region that is destroyed/recreated with each quote
  swap is never announced by screen readers; the wrapper survives swaps so text changes
  inside it get announced.
- **Agenda groups list semantics (was ~L849–872)**: both TaskRow grids (pending groups grid
  + the "Selesai" collapsed-panel grid) now have `role="list"`; each TaskRow is wrapped in
  `<div key={h.id} role="listitem">` (wrapper lives in home.tsx because task-row.tsx is
  off-scope). React key moved from TaskRow to the wrapper.
- **Streak flame ambientPulse (was ~L662)**: hero Flame wrapped in
  `<m.span className="flex" animate={{scale:[1,1.06,1]}} transition={motionTokens.preset.ambientPulse}>`;
  icon keeps its size/stroke classes; `aria-hidden` moved to the wrapper. Amplitude 6% (≤8%
  directive). Only flame instance in home.tsx is wired.

### bugar.tsx
- **Per-block firstVisit keys** (six components previously shared `'bugar-studio'`):
  - L144 `ProgramCard` → `'bugar-studio-program'`
  - L288 `WorkoutRow` → `'bugar-studio-history'` (riwayat aktivitas rows)
  - L643 `TonaseStrip` → `'bugar-studio-tonase'`
  - L846 `ActivityMixStrip` → `'bugar-studio-campuran'` ("Campuran Aktivitas")
  - L1037 `PaceStrip` → `'bugar-studio-tren'` (its header is literally "Tren Pace")
  - L1201 `BugarScreen` → `'bugar-studio-hero'` (it gates the hero week-summary block)
- **Weekly-minutes Counter (was ~L1414)**: `<Counter to={...} immediate={!playEntrance} />`
  — no more 0→N retick on remount (matches the home.tsx L682 pattern; Counter.immediate
  verified in counter.tsx).
- **4-metric fade gate (was ~L1461)**: `initial={{opacity:0}}` →
  `initial={playEntrance ? {opacity:0} : false}` using BugarScreen's firstVisit var.
- **L513**: `bg-destructive text-white` → `text-destructive-foreground`.
- **L947**: `text-[9px]` (extra-session "+N" label) → `text-[10px]`.
- **whileTap normalization**: L1573 main CTA 0.98→0.97; L2046 & L2083 empty-state CTAs
  0.95→0.96.

### profile.tsx
- **Double CONTENT_W removed (was ~L551)**: root className is now
  `"h-full w-full overflow-y-auto no-scrollbar px-4 pb-16 pt-..."` — dropped inner `mx-auto`
  + `${CONTENT_W}` (shell rutina-app L262 already wraps every screen in
  `absolute inset-0 mx-auto w-full ${CONTENT_W}`; identical caps). The now-unused
  `CONTENT_W` import was removed.
- **Reduced-motion scrollIntoView (was ~L611)**: added
  `import { useReducedMotion } from 'motion/react'`; `behavior: reducedMotion ? 'auto' : 'smooth'`.
- **L1363**: `bg-destructive text-white` → `text-destructive-foreground`.
- **Scrollspy perf (~L486–515)**: wrapped in useMemo keyed on their inputs —
  `activeSince` ([completions]; activeSinceISO sorts ALL completion keys per render otherwise),
  `memberBadge` ([activeSince]), `reminderCount` ([habits]), `moodDays` ([moodLogs, today]),
  `moodCounts` ([moodDays]). `moodLogged`/`todayMood` left inline (trivial .some()/index).
  `doneCountOn` left as-is (single-day lookup, cheap). Scrollspy setActiveCat renders during
  scroll no longer recompute these.

### fitness/workout-sheet.tsx
- **Stable block ids**: `SetBlock` interface gains `id: string`; helper
  `blockId = () => \`b-${Date.now()}-${Math.random().toString(36).slice(2,7)}\`` (style matched
  to session-store `sx-${Date.now()}-...`). Applied at every creation point: `seedToBlocks`,
  `emptyBlock` (covers initial state, open-reset, and "Tambah gerakan" append). Blocks list
  keyed `key={b.id}` instead of `key={i}` — exit animations now play on the deleted card.
  Delete filter logic untouched (index at click-time is still correct). Sheet only creates
  blocks on user action → Date.now() hydration-safe.
- **Panel elevation (~L326)**: added `shadow-sheet` to the panel className (matches
  RutinaSheet and sibling fitness sheets).
- **Simpan CTA (~L751)**: whileTap 0.98 → 0.97.

### fitness/workout-session.tsx
- **L830 & L840**: `animate-pulse-soft` → `motion-safe:animate-pulse-soft` (both are
  functional live-session indicators — "Sedang berlangsung" dot and all-done "Akhiri & Simpan"
  button — allowed per policy but must be motion-safe).
- **L1615**: "Mulai Sesi" CTA whileTap 0.98 → 0.97.

### fitness/barbell-tools.tsx
- **L213**: barbell "kg" unit label `text-[8px]` → `text-[10px]` (10px typography floor).

## Fixes NOT applied
None — every fix in the task brief was applied.

## Deviations + justification
1. **bugar key names**: the brief suggested 'asupan'/'tubuh' keys, but those panels
   (asupan-panel.tsx / tubuh-panel.tsx) do not use useFirstVisit at all — the six duplicated
   keys in bugar.tsx are ProgramCard/WorkoutRow/TonaseStrip/ActivityMixStrip/PaceStrip/
   BugarScreen. Named them by actual purpose per the brief's "match each component's actual
   purpose" instruction: program / history / tonase / campuran / tren / hero (prefix
   'bugar-studio' kept).
2. **home.tsx role="list"**: applied to BOTH TaskRow grids (pending groups AND the "Selesai"
   folded panel) — both are "agenda groups rendering repeated TaskRow items"; the done panel
   is the same a11y pattern.
3. **quote aria-live**: put the attribute on a NEW persistent wrapper div around
   AnimatePresence rather than on the keyed m.div — attribute on the changing element itself
   is unreliable (live region remounts with content already set). This matches the brief's
   "or a wrapping element with the changing text inside" option.

## Lint summary
- `bun run lint` → clean (exit 0, zero errors/warnings) after fixing one self-introduced
  JSX parse error (a `/* */` comment placed inside a JSX opening tag in profile.tsx was
  moved above the `return`).
- `bunx tsc --noEmit` → clean.
- dev.log: all recompiles successful, page serves 200, no runtime errors.
