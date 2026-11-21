# VIZ-KEB-STAT — Illustrated Visualizations (Kebiasaan Growth Garden + Statistik Life Observatory)

Task: implement D1–D6 per creative brief "Warm Editorial Productivity — Illustrated Data
Visualization". New files ONLY under `src/components/rutina-mobile/visualizations/{habits,stats}/`.
Edits: screens/kebiasaan.tsx (mount vine only), plant-glyph.tsx (light), heatmap.tsx (light),
habit-comparison-matrix.tsx (light), screens/stats.tsx (trend chart + donut + mission bars only).

## Key facts discovered (for later agents)

- `daySchedules(habits, c, today, days)` in store.ts (~L804) is a ROLLING window ending today
  (NOT Monday-week). For a Monday-week, compute locally: pool = habits.filter(h =>
  scheduledOn(h, iso) && h.createdAt <= iso); forgiven = pool with restDays incl. iso;
  due = pool − forgiven; done = due ∩ isDoneOn; pct = due.length ? round(done/due*100) : null.
- Helpers exported from store.ts: `scheduledOn`, `isDoneOn`, `habitsOn`, `daySchedules`,
  `weekStartISO`, `addDaysISO`, `fromISO`, `todayISO`, `shortDateLabel`, `longDateLabel`,
  `WEEKDAY_MIN` (index 0 = Min), `HABIT_CAT_COLORS`, types `Habit`, `HabitCat`, `Completions`.
- Motion: `import * as m from 'motion/react-m'`; hooks from 'motion/react'; tokens
  `motionTokens` (@/lib/motion/tokens), `barFill/chartBar` (@/lib/motion/transitions).
  Anti-replay `useFirstVisit(key)`; existing keys include 'kebiasaan-garden', 'kebiasaan-matrix',
  'kebiasaan-heatmap', 'stats-observatory', 'stats-heatmap'. New keys used by this task:
  'kebiasaan-vine' (D1), 'stats-constellation' (D4), 'stats-flower' (D5).
- anime.js v4 (`animate, stagger` used in heatmap/stats) — cleanup via anim.cancel().
- Module colors: kebiasaan = Rose Clay (#b0765f via data-module="kebiasaan"), stats = Mineral
  Slate (#71899a via data-module="stats"). Category tokens var(--habit-cat-*). --chart-stroke-4
  = matcha deep (light) / chart-4 (dark). --clay, --gold, --pistachio tokens exist.
- stats.tsx: Recharts was used ONLY for 30-day trend (AreaChart) and category donut (PieChart).
  Both are now replaced → recharts import block + CHART_TOOLTIP_* + trendTick + `rateSeries`
  import removed; `shortDateLabel` KEPT (used elsewhere). donutRef/donutInView removed.
  NOTE: screens/keuangan.tsx (other agent's file) still uses recharts — package stays.
- Mission bars (D6): data weekData/dayCounts 7d + monthData/weekCounts P1–P4; anime stagger
  effect keyed on [data-bar] with barsPlayedRef + playEntrance guards — PRESERVED. Height
  formula preserved EXACTLY: value===0 → 3px, else max(round(v/chartMax*84), 6).
- kebiasaan.tsx Konsistensi section: metric bed → GrowthVine (NEW, mt-4, garden-bed) →
  HabitComparisonMatrix → Heatmap → PlantGarden. Vine only mounts when activeHabits > 0
  (inside the existing fragment branch).
- DayDetailSheet { date: string|null, onClose } from '../../day-detail-sheet' (relative to
  visualizations/habits/*) — drill-down target used by D1 (local open state).
- Shared helpers: visualizations/shared/chart-frame.tsx (ChartFrame/ChartSrSummary/ChartLegend),
  visualizations/shared/svg-id.ts (useSvgId) — not needed this task (no SVG ids/clipPaths used;
  half-leaf fill is geometric, no clip).
- habit-coach.ts plantStageOf thresholds [1,7,21,60] — READ-ONLY, untouched.
- plant-glyph.tsx: canopy path smoothed (collinear handles), blooms are now 4-petal flowers
  with var(--gold) centers (module-level `Bloom` component); data-plant hooks + one-time
  milestone guards unchanged.
- Parallel agents were editing keuangan.tsx/fin-chart.tsx during verification — a transient
  tsc error in THEIR file appeared and resolved itself; final full tsc+lint are clean.

## Deliverables status (ALL COMPLETE)

- [x] D1 growth-vine.tsx — 7-node Monday-week vine; states full/partial/pending(today)/
      missed(droop clay)/rest(dashed bud)/future; overlay buttons + reading line +
      "Lihat detail hari" → DayDetailSheet; legend with mini-shape swatches; stem pathLength
      draw + staggered leaf pop (first visit only).
- [x] D2 plant-glyph light refinement (smoother canopy, gold-centered 4-petal blooms).
- [x] D3 heatmap legend swatch radius 4px echo; matrix header tabular-nums + nowrap.
- [x] D4 life-constellation.tsx — exported pure constellationDays/constellationStats;
      adaptive-width SVG (ResizeObserver, no text stretching); stars/constellation line/
      dim null dots/25-50-75 gridlines/dashed non-null avg + "rata²" label/~7-day x ticks;
      per-day overlay buttons; reading line; badge/footer/legend/empty state kept in stats.
- [x] D5 habit-flower.tsx — equal-angle petals, linear outerR 24+value/max*34, category
      colors 85%, center total disc, legend button rows (primary selectors) + petal clicks,
      lift 2px/dim 55%, entrance 'stats-flower'.
- [x] D6 mission harvest stems — rounded-t-full module-accent gradient, matcha leaf cap /
      gold fruit cap on peak (gradient emphasis kept), selected darkens to module-accent-strong
      + cap scale 1.15, eyebrow "panen misi"; heights/keys/guards untouched.
- [x] Verification: `bunx tsc --noEmit` clean; `bun run lint` clean; dev.log — page compiles,
      GET / 200, no errors from these files.
