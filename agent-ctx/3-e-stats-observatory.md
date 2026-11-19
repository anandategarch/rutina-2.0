# Task 3-e — Statistik "Personal Data Observatory" (stats.tsx upgrade)

File edited (ONLY this file): `src/components/rutina-mobile/screens/stats.tsx` (1612 -> 1763 lines).
Foundation consumed: `[data-layout='observatory']` tokens already in globals.css (`--layout-gap: 1.25rem; --layout-hero-radius: 1.5rem`, lines 517-520). No changes to globals.css, store.ts, heatmap.tsx, trend-line.tsx, or other screens.

## Changes (line refs = final file)

1. **Root + layout token stack**
   - L580-583: root div now `data-module="stats" data-layout="observatory"`.
   - L606-609: new wrapper `<div className="mt-[var(--layout-gap)] flex flex-col gap-[var(--layout-gap)]">` right under the player header; ALL main sections are its children. Removed per-section `mt-5/mt-6/mt-3` (old L527, 605, 695, 1024, 1030, 1258, 1487) -> uniform observatory rhythm from the layout token.
   - L1755: stack closes before `DayDetailSheet` (sheet stays last child of root; `<main>` landmark NOT used because app-frame.tsx L85 already owns one).

2. **KPI strip — 4 bento stat tiles (L683-717), placed AFTER the XP ring**
   - `RutinaBentoGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-4"` (twMerge overrides the base 6/12-col presets); `RutinaBentoItem` children, cocoa tiles `rounded-[16px] border border-border bg-cocoa p-4 shadow-soft`, slate identity via `bg-module-accent` dot on the 10px uppercase label, 28px tabular-nums value + small unit, tiny caption, subtle whileInView fade only (y collapses to 0 under reduced motion), 0.05s stagger.
   - Data sources (NO new formulas — same sources of truth as existing widgets):
     - **Konsistensi 30 Hari**: new `kpi` useMemo (L367-385) = ratio of totals over last 30 days using `habitsOn` + `isDoneOn` — the exact primitives of `rateSeries` (store) and `monthReport.pct` (L210-257). Caption: "{done} dari {sched} terjadwal".
     - **Misi Selesai**: `doneCountOn` summed over 30 days in the same `kpi` memo — the same counter the Misi Selesai chart counts via `dayCounts`/`weekCounts`. Fixed 30-day window (caption "dalam 30 hari terakhir") so the strip is a stable rolling lens above the period-driven chart; formatted `toLocaleString('id-ID')`.
     - **Streak Berjalan**: `best.streak` (`bestStreak` util — same as Streak Terpanjang card & Streak Berjalan widget).
     - **Rekor Streak**: `best.record` (`bestStreak`/`longestStreak`).
   - `kpiTiles` array at L387-419.

3. **Misi chart bento pair — 8:4 "chart + insight" (L719-840)**
   - Chose the spec's option B: a **"Fokus Periode" feature(4) control panel** (L723-772) — period Tabs (moved out of the chart card, restyled to 44px touch targets: TabsList h-[52px] p-1, triggers h-11), big `<Counter to={chartTotal} />` + "misi / pekan|bulan" (moved), window note, and the one-line chart summary (moved; logic extracted to `chartSummary` const L478-489). Zero duplication — everything moved, nothing copied.
   - Rationale vs option A (donut move): keeps Wawasan's donut+area pairing intact, lower regression risk, and gives the observatory an instrument-panel character. DOM order feature->wide so the period control sits above/left of the instrument on mobile and desktop.
   - **Wide(8) chart card** (L774-839): `ref={chartRef}` kept, title "Misi Selesai" + axis hint ("per hari"/"per pekan"), pure bars + day labels, `h-full` + `mt-auto` so the pair aligns heights.
   - Ratios via raw classes: items `sm:col-span-6 xl:col-span-4` / `sm:col-span-6 xl:col-span-8`.

4. **Kalender Aktivitas (7) + Laporan Bulanan (5) — L1177-1179, 1180, 1227**
   - `<RutinaBentoItem span="wide">` -> `className="sm:col-span-6 xl:col-span-7"`; `span="feature"` -> `className="sm:col-span-6 xl:col-span-5"` (presets lack 7/5). Grid itself is the standard RutinaBentoGrid (grid-cols-1 / sm:6 / xl:12).

5. **anime.js discipline — first-view-only stagger (L539-576)**
   - Stagger code kept, gated by `barsPlayedRef` (useRef): plays once when `chartInView` first fires; `period` removed from deps so period switches no longer re-run the choreography.
   - Removed the `anim.revert()` cleanup deliberately: revert restores the pre-animation inline `scaleY(0)` and would leave bars stuck invisible when deps change after the one-shot gate; with no re-runs there is nothing to cancel (comment documents this).
   - Period changes now morph bar heights via a light CSS transition on the existing height pattern: bars keyed by INDEX (L806) so P1-P4 reuse the same DOM nodes as days 1-4; inline `transition: height 480ms cubic-bezier(<motionTokens.easing.standard>)`, disabled under reduced motion (L822-824). Heatmap/TrendLine children untouched.

6. **tabular-nums** added to all new numbers: KPI values (L703), feature-tile total inherits Counter's internal tabular-nums, bar labels/axis hints unchanged (non-numeric).

## Final bento structure (top -> bottom)
- Player header (outside stack)
- XP ring section
- **KPI strip: stat x4 (grid-cols-2 / sm:4 / xl:4)**
- **Fokus Periode feature(4) + Misi Selesai chart wide(8)** — 8:4
- Ringkasan Pekan medium(6) + Wawasan & Analitik medium(6) — 6:6 (unchanged content)
- Heatmap + TrendLine plain sm:grid-cols-2 (untouched children)
- **Kalender Aktivitas 7 + Laporan Bulanan 5** — 7:5
- Pekan Ini vs Pekan Lalu medium(6) + Bugar & Tubuh medium(6) — 6:6 (unchanged)
- Piala & Lencana medium(6) + Streak berjalan medium(6) — 6:6 (unchanged)
- DayDetailSheet (unchanged, outside stack)

## Verification
- `bunx tsc --noEmit` — clean.
- `bun run lint` — clean (0 errors, 0 warnings introduced).
- dev.log — app compiles and serves GET / 200 after edits; no runtime errors in log.
- All features preserved: period tabs (relocated + enlarged), XP ring, donut/area charts with legends/tooltips, calendar + day sheet, week comparison, badges, monthly report, Heatmap/TrendLine one-shots.

## Notes for other agents
- `data-layout` is a pure token hook: consume via `var(--layout-gap)` / `var(--layout-hero-radius)` inside the screen; no globals.css edits needed.
- Do NOT nest another `<main>` in screens — app-frame.tsx already provides the landmark.
- RutinaBentoGrid presets only support 8/6/4/3/12-col spans; for 7/5 use className col-spans (twMerge merges cleanly).
