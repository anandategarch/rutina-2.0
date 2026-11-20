# Fix Agent 5-b2 — stats.tsx polish (Task ID: 5-b2)

File scope: `src/components/rutina-mobile/screens/stats.tsx` (only file touched).
File grew 2559 → 2627 lines after edits.

## (1) Fixes applied

1. **Bar wave replay gate (P1)** — stats.tsx ~917–924 (was ~861–864).
   Guard changed from `if (barsPlayedRef.current) return` to
   `if (!playEntrance || barsPlayedRef.current) return`, reusing the existing
   `playEntrance = useFirstVisit('stats-observatory')` (line 307). Refs reset per
   remount, so previously the anime.js stagger replayed on every return to the
   Stats tab; now it plays only on the first visit per tab session.
   Verified the `scaleY(0)` hide step sits AFTER the gate (line 925–929) and no
   other initial-hidden style exists on `[data-bar]` (JSX bar div has no initial
   opacity/transform) → on repeat visits bars render directly at final state.
   Effect deps kept as `[chartInView, reducedMotion]` — `playEntrance` is stable
   per mount (useState initializer in useFirstVisit), so omitting it from deps is
   behavior-safe; `react-hooks/exhaustive-deps` is off in this repo's ESLint config.

2. **Four Counters retick from 0 (P1)** — added `immediate={!playEntrance}` to:
   - XP ring: `<Counter to={xp} immediate={!playEntrance} /> XP` (now line 1047)
   - KPI consistency: `<Counter to={kpi.consistency} immediate={!playEntrance} />` (now 1076)
   - Fokus periode total: `<Counter to={chartTotal} immediate={!playEntrance} />` (now 1161)
   - Trend average: `<Counter to={trendAvg} decimals={1} immediate={!playEntrance} />` (now 1331)
   All four are in the main `StatsScreen` component scope, so `playEntrance`
   (line 307) is directly in scope — no prop drilling or extra hooks needed.
   Matches the existing convention (home.tsx:692, weekly-recap-card.tsx:399).

3. **scrollIntoView reduced-motion** — stats.tsx ~963–970 (was ~961).
   `behavior: reducedMotion ? 'auto' : 'smooth'`, reusing the `reducedMotion`
   already computed at line 902 in the same component (`useReducedMotion` was
   already imported). Added a short Indonesian comment explaining why.

4. **Section card radius unification** — 5 section-level bento cards changed
   `rounded-lg` → `rounded-2xl` (now lines 1757, 1851, 2065, 2214, 2314; was
   1749/1843/2057/2206/2306). Each confirmed as a peer card with the
   `border border-border bg-surface-primary p-5 shadow-soft` pattern next to
   `RutinaCard radius="2xl"` sections: Komposisi Kebiasaan Aktif (donut),
   Wawasan Lintas Domain, Latihan · 30 hari, Asupan · 7 hari, Tubuh · 7 hari.
   Inner elements (bar buttons at ~1295, chips, tiles, KPI strip at 1066,
   chart cards 1126/1188/1316, check-in card 2530) left untouched — not in scope.

5. **Avatar recipe unify** — stats.tsx ~922–926 (was ~917–920).
   `border-2 border-matcha/40` + `bg-matcha-action` → `border-2 border-cocoa/40`
   + `bg-cocoa`, keeping `text-eyebrow font-semibold tracking-widest
   text-parchment` and the `h-10 w-10` size. Now matches the standard recipe
   (home.tsx:571, profile.tsx:685). Comment updated to explain the standardization.

6. **Heavy derivations memoization (P2 perf)** — two regions wrapped in useMemo,
   mirroring the file's existing `kpi`/`crossInsights`/`monthReport` memo style:
   - **Profile/streak group** (now lines 523–544, was ~526–538): one memo for
     `todayHabits → doneCount → xp → level/progress/remaining` + `bestStreak`
     (the documented O(habits×history) call) + `activeHabits`. Deps:
     `[habits, completions, today, bonusClaimed]`.
   - **Cross-module Bugar block** (now lines 636–761, was ~633–705): split
     logically into 4 memos by input domain (fewer recomputes than one big memo):
     - fit memo `[workouts, today]` → `recent, fitSessions, fitTonase, topPr
       (prBoard), cardio (cardioSummary), weeklyFit`
     - intake memo `[foodEntries, today]` → `last7Kcal, avgKcal, kcalWeek,
       kcalWeekLogged` (kcalByDay internal)
     - body memo `[bodyLogs, today]` → `last7Logs, avgSleep, avgEnergy, avgWater,
       weightDelta (weightSeries), sleepWeek/energyWeek/waterWeek (bodySeries×3)`
     - mission series memo `[completions, today]` → `weekData (dayCounts),
       monthData (weekCounts)`
   Pure refactor: all downstream variable names preserved via destructuring,
   identical computation order/logic, JSX below unchanged. `chartData`/`chartMax`/
   `chartTotal`/`peak`/`p3`/`p4`/`chartSummary` intentionally left in render body —
   they depend on `period` and are trivial maps. Trigger check: setSelBar (bar tap
   ~1257), month nav, day select, and period switch no longer re-run the heavy
   sweeps; only zustand data or `today` changes do.

7. **Heatmap visitKey pass-through** — stats.tsx now line 1514 (was 1447):
   `<Heatmap visitKey="stats-heatmap" />`, with comment explaining the anti-replay
   gate handoff. The sibling agent's heatmap.tsx edit (`visitKey?: string`, line 79)
   had already landed by my final check, so the prop typechecks cleanly — no race.

## (2) Fixes NOT applied

- None of the 7 specified fixes were skipped.

## (3) Deviations + justification

- **Fix 4 scope note (observation only, no code change):** the "Tren Penyelesaian"
  card (now line 1316, `rounded-lg border border-border bg-surface-primary p-5
  shadow-soft`) also matches the section-card pattern and sits in the same grid
  as the Heatmap whose internal root card is `rounded-2xl` (heatmap.tsx:159) —
  arguably the same two-radii issue. It was NOT in the 5 specified line numbers,
  so per the "only the specified fixes / don't change beyond specified"
  constraint I left it alone. Flagging for the orchestrator in case it was an
  audit omission.
- **Fix 6 memo split:** task allowed "one memo for the block (or split
  logically)" — I split into 4 domain memos so that (e.g.) a foodEntries change
  doesn't recompute workout stats. Within the rewritten block, statement order
  was regrouped by domain (weeklyFit moved next to the other workout stats);
  logic and results are identical, all original comments preserved/adapted.
- **Fix 5 border color:** kept a border (as the current design had one) using
  `border-cocoa/40` as suggested by the task.

## (4) Lint / tsc summary

- `bun run lint` → clean, zero warnings/errors.
- `bunx tsc --noEmit` → exit 0, zero errors project-wide (nothing in stats.tsx;
  the Heatmap visitKey prop race resolved itself — the other agent's heatmap.tsx
  edit landed before my check).
- dev.log: compiles clean after edits, no runtime errors.

## Notes for downstream agents

- `playEntrance` key for this screen: `'stats-observatory'`; child-block keys
  should follow `'stats-<blok>'` (I used `'stats-heatmap'` for the Heatmap handoff).
- The bar-wave effect deps must stay `[chartInView, reducedMotion]`; `playEntrance`
  is intentionally omitted (stable per mount).
