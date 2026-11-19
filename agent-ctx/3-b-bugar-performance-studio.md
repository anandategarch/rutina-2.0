# Task 3-b — Bugar "Performance Studio" (design system upgrade)

Agent: 3-b (Bugar Performance Studio). Status: DONE — `bun run lint` exit 0 (no errors/warnings),
`bunx tsc --noEmit` exit 0, dev.log clean (no runtime errors), full E2E smoke-tested in headless
browser (390×844): session flow + rest ring + tabs + Asupan hero all verified against the live DOM.

Scope: ONLY the three files listed by the task. globals.css / store.ts / fit-utils / other screens
untouched. SessionCelebration (anime.js) untouched. PR board keeps gold. Stepper untouched.

## Files changed

1. `src/components/rutina-mobile/screens/bugar.tsx`
2. `src/components/rutina-mobile/fitness/workout-session.tsx` (RestCard only)
3. `src/components/rutina-mobile/fitness/asupan-panel.tsx` (hero only)

## Deliverable 1 — data-layout="performance" + --layout-gap section stack

- bugar.tsx L627: root div now `data-module="bugar" data-layout="performance"` → provides
  `--layout-gap: 1.25rem` (globals.css `[data-layout='performance']`, pre-existing, not edited).
- bugar.tsx L982–983: the four main sections (Program Latihan, Riwayat, Papan Rekor, Pustaka
  Gerakan) are wrapped in `<div className="mt-[var(--layout-gap)] flex flex-col gap-[var(--layout-gap)]">`;
  their old `mt-7`/`mt-8` per-section margins were removed (no margin fighting — single gap rhythm).
- TonaseStrip (L488) also uses `mt-[var(--layout-gap)]` so the whole Latihan stack shares the token.

## Deliverable 2 — Rest timer ring (workout-session.tsx RestCard)

- L4: added `useReducedMotion` to the motion/react import.
- L233–236: ring geometry constants `RING_R = 38`, `RING_CIRC = 2π×38 ≈ 238.76` (viewBox 0 0 88 88).
- L255: `const reducedMotion = useReducedMotion()`.
- L263–265: `pct` (bar %) replaced by `frac = min(1, remaining / max(restDuration,1))` — extendRest
  extends BOTH restingUntil and restDuration (session-store), so the ring stays proportional on +15s.
- L327–398: horizontal bar + big mm:ss `<m.p>` replaced by:
  - 88×88 SVG (`-rotate-90`, aria-hidden) — track circle `stroke="currentColor"` with
    `text-hero-content/12`; progress `m.circle` `stroke="currentColor"` with `text-module-accent`
    (eucalyptus #5f8a82 resolves via `[data-module='bugar']` because WorkoutSessionOverlay is mounted
    inside the Bugar screen root; computed stroke verified rgb(95,138,130) in browser). Contrast on
    the espresso `bg-hero-surface`: 4.27:1 light (≥3:1 graphics/large text), ~7:1 dark (#8fb8af).
  - `strokeDasharray={RING_CIRC}` + Motion `animate={{ strokeDashoffset: RING_CIRC*(1-frac) }}`,
    `initial={false}`, `transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'linear' }}`
    (same cadence as the old bar; transform-safe property).
  - Center: remaining seconds `text-3xl font-bold tabular-nums` (`text-hero-content`, urgent ≤5s →
    `text-hero-accent` — existing urgent color) + tiny uppercase `dtk` label.
  - Right column: the unchanged `+15 dtk` and `Lewati` buttons (h-11 = 44px targets) stacked next to
    the ring; header row (label + sound toggle) untouched.
  - The old infinite urgent scale-pulse was REMOVED (no infinite animations rule); urgency is
    color-only now. Beeps/chime/speech + `role="timer"` + `aria-label="Istirahat mm:ss"` preserved.
- Browser-verified: dasharray 238.76, offset animating with countdown, seconds "90"→"81"→"85" after
  +15 dtk (offset 46.76 = proportional), Lewati clears the card, session continues.

## Deliverable 3 — "TONASE 7 HARI" mini chart (bugar.tsx Latihan)

- L440–452: `TONASE_DAY_LETTERS = ['S','S','R','K','J','S','M']` (Sen Sel Rab Kam Jum Sab Min) +
  full names for the aria-label.
- L454–555: new `TonaseStrip()` component (own store subscription, `useRutina(s => s.workouts)`).
  - Data source: SAME logic as the hero's `weekSummary` — per-day split. `weekRange().start` (Monday
    of current week) → 7 ISO dates via `addDaysISO`; for each date, sum `tonaseOf(w)` over
    `workouts.filter(w => w.date === d)` (tonaseOf = Σ weight×reps of 'beban' sets, from fit-utils).
    Week total = sum of the 7 values (equals hero `week.tonase`).
  - Header: uppercase technical label "TONASE 7 HARI" + week total in tabular-nums
    (`≥1000 → "x,x t"` else id-ID rounding) in `text-module-accent-strong`.
  - 7 thin bars in a fixed `h-16` (64px) track, flex-1 columns, rounded-full tops. Heights:
    data day = `max(v/max*100, 12)%`, empty day = faint 6% stub. Colors: `bg-module-accent/90`
    (eucalyptus 0.9 opacity) for data days, `bg-module-accent/20` for empty days. Today's letter
    label highlighted `text-module-accent-strong`.
  - Animation: bars grow via `scaleY` 0→1 with `transformOrigin: 'bottom'` (transform-only),
    stagger `motionTokens.stagger.normal`, disabled when `useReducedMotion()`.
  - A11y: section `aria-label="Tonase 7 hari pekan ini"`; bar row is `role="img"` with per-day
    aria-label ("Senin 980 kg, …").
- L979–980: rendered directly below the bento grid (inside the latihan panel), NOT inside the hero —
  chosen because eucalyptus bars need a neutral background (they'd vanish on the eucalyptus hero).

## Deliverable 4 — Gold discipline (coach warnings → clay/terracotta)

bugar.tsx (all previously `warning/gold`):
- L854 Deload card: `border-warning/40 bg-gold/25` → `border-destructive/35 bg-destructive/10`
  (destructive-soft style; destructive = terracotta light / clay dark).
- L857 Deload icon chip: `bg-warning text-content-inverse` → `bg-destructive text-destructive-foreground`.
- L875 "Akhiri deload sekarang": `border-warning/50 text-warning hover:bg-gold/40 …outline-warning`
  → `border-destructive/45 text-content-danger hover:bg-destructive/15 …outline-destructive`.
- L885 Plateau card container + L888 icon chip: same swaps as deload card.
- L902 stalled-exercise chips: `text-warning` → `text-content-danger`.
- L920 "Mulai deload 7 hari": `bg-warning text-content-inverse hover:bg-gold/50 …outline-warning`
  → `bg-destructive text-destructive-foreground hover:bg-destructive/90 …outline-destructive`.
- L933 Cardio-guard card: `border-warning/35` → `border-destructive/30`; L936 icon chip
  `bg-gold/40 text-warning` → `bg-destructive/15 text-content-danger` (mirrors readiness chip pattern).
- UNCHANGED (gold kept, verified in DOM — goldCount=1): PR board #1 row (L1084 `border-warning/40
  bg-gold/25`, L1090 rank badge) and section Trophy icon (L1050). Only warnings changed.

## Deliverable 5 — AsupanPanel hero module identity (asupan-panel.tsx)

- L173 hero root: `bg-primary … text-primary-foreground shadow-leaf` → `bg-module-accent p-6
  text-module-accent-fg shadow-leaf` (mirrors the Latihan hero in bugar.tsx; panel is inside
  `data-module="bugar"` so it renders eucalyptus; auto-flips in dark mode).
- Every `primary-foreground` inside the hero (L177, 185, 197, 221, 232, 240, 256, 266, 269, 277,
  281, 283, 289, 296, 306, 310, 318, 330, 338, 346, 352) → `module-accent-fg` (incl. "Atur target"
  chip, target editor +/-/Input/"Simpan", progress track+fill, burned row, coaching texts, macro
  labels). `text-content-primary` kept on "Simpan" (reads correctly on the fg-colored button in both
  themes). Focus rings → `outline-module-accent-fg`.
- L312: Sparkles icon `text-pistachio` → `text-module-accent-fg` (pistachio on eucalyptus ≈ 2:1,
  unreadable). Gold Flame + gold AlertTriangle kept (they sit on `bg-espresso/35` chips ≈ 3:1, kcal/
  warning semantics). 7-day chart bar `bg-primary` (L475) intentionally untouched — outside the hero.
- Browser-verified: hero renders `bg-module-accent text-module-accent-fg`, 0 `primary-foreground`
  classes remain inside the hero, fill = `bg-module-accent-fg`.

## Deliverable 6 — Subtab crossfade (bugar.tsx)

- Content switching was instant; now L669–1214: the three panels are keyed children of
  `<AnimatePresence mode="wait" initial={false}>` — each wrapped in an `m.div`
  (key="latihan" L670–682+1182, key="asupan" L1185–1198, key="tubuh" L1200–1213) fading
  opacity-only 0→1 / 1→0, `duration: reducedMotion ? 0 : 0.18`, `ease: motionTokens.easing.standard`.
  `initial={false}` keeps first paint animation-free; inner entrance animations replay on switch as
  before. The `<>…</>` fragment for Latihan became the keyed m.div (structure otherwise unchanged).

## Constraints respected

- Only 3 files edited; no test code; no globals.css/store/fit-utils changes.
- New animations: opacity + scaleY + strokeDashoffset only; `useReducedMotion` gates every new
  animation; zero infinite/constant animations (removed the old urgent repeat:Infinity pulse);
  Motion and anime.js never share an element (anime.js untouched in SessionCelebration).
- Tabular-nums on all new metrics (tonnage total, ring seconds); 44px touch targets kept (h-11
  buttons); Indonesian labels/copy throughout; no blue/indigo introduced.

## Verification

- `bun run lint` → exit 0, no output. `bunx tsc --noEmit` → exit 0. dev.log → no errors.
- Headless browser E2E: Bugar renders (data-layout="performance", TonaseStrip 7 bars proportional
  6/6/100/28.9/6/6/6% with total "980 kg pekan ini"), tab switches Latihan↔Asupan↔Tubuh OK,
  session picker → empty session → add Bench Press → SET SELESAI → RestCard ring (eucalyptus stroke,
  dasharray 238.76, animating offset, seconds 90→81) → +15 dtk (01:25, offset 46.76) → Lewati →
  Akhiri → Buang sesi — all working. Test session discarded (memory-only store, never persisted).
