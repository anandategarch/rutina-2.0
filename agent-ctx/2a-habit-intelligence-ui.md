# Task 2a — Habit Intelligence UI (Rutina 2.0)

Agent: habit-intelligence-ui (subagent "Task 2a")
Scope: `src/components/rutina-mobile/task-row.tsx`, `habit-sheet.tsx`, `screens/home.tsx` + 2 NEW allowed files `home-finance-card.tsx`, `plant-garden.tsx`. No other files touched (store.ts, habit-coach.ts, sync-*, src/lib, api, prisma, other screens all untouched).

## What was built

### 1. habit-sheet.tsx — extended habit editor
- `EMPTY_DRAFT` now includes `restDays: []`, `afterId: null`, `mini: ''` (fixes the missing HabitInput fields); edit-mode prefill loads them from the habit (`mini: editing.mini ?? ''` etc.).
- New form sections (same styling grammar as existing sections — Label + Input + hint, icon-led section spans):
  - **Versi 2 Menit** — text input (`id="habit-mini"`), placeholder "Contoh: baca satu halaman", helper "Bentuk terkecil kebiasaan ini — cukup dua menit untuk memulai." (Zap icon).
  - **Susun Kebiasaan** — chip picker (Link2 icon): "Tanpa pemicu" clear chip + one chip per OTHER active (non-archived, non-self) habit; aria-pressed states; live preview sentence `Setelah "{trigger}", saya akan menjalankan kebiasaan ini.` (fallback prompt when none selected; friendly note when no other habits exist).
  - **Jeda Runtun Aman** (edit mode only) — sunken panel (Snowflake icon) with the exact explainer copy; upcoming scheduled rest days as gold chips (shortDateLabel); next 14 days **filtered to `scheduledOn(h, iso)`** with per-row toggle "Jadwalkan jeda"/"Batalkan" calling `scheduleRestDay`/`cancelRestDay`; `!result.ok` → `toast.error(result.error)`; success/cancel toasts; "Tidak ada hari terjadwal dalam 14 hari ke depan." fallback.
- Submit path: passes `mini` (trimmed), `afterId` (normalized `|| null`), and `restDays` — in edit mode `restDays` is taken from the LIVE habit (`editing.restDays`), not the stale draft, because the Jeda section mutates the store immediately (avoids save clobbering rest-day changes made while the sheet was open).

### 2. task-row.tsx — richer row (all extras in the expanded detail; collapsed row untouched)
- Subscribes to `useRutina` habits/completions internally so NO prop changes were needed (call sites in home.tsx untouched).
- **Trigger chip** — if `h.afterId` resolves via `triggerLabelOf`: chip `Setelah {triggerTitle}` with Link2 icon (bg-primary/15 text-success) under the description.
- **Versi 2 menit secondary action** — if `h.mini && !done && !readOnly`: full-width dashed ghost/outline block above the action row ("Versi 2 menit" + the mini text + "Selesaikan"); tap → `onToggle()` (completes for the row's date) + `toast.success("Cukup {mini} — dihitung!")`.
- **Plant stage block** — subtle bg-surface-secondary/70 tile: emoji + stage label + progress text `${total} dari ${nextAt} untuk {nextStageLabel}` (or "Tahap akhir" when `nextAt` null) + stage hint (from `plantStageOf`/`PLANT_STAGES`).

### 3. screens/home.tsx — Daily Command Center upgrades
- **a. Kutipan harian**: replaced `QUOTE_TEXT/QUOTE_AUTHOR` with `dailyQuote(today)`; save button disabled state now `quoteSavedDate === today` (selector swapped from `quoteSaved` to `quoteSavedDate`); saveQuote() already guards once-per-day. Editorial dark card design unchanged.
- **b. Nudge "Jangan Bolong Dua Kali"** (after the agenda section): warm amber card — `border-gold/45 bg-gold/15`, Bell icon in `bg-gold/30 text-warning` (NOT red); lists missed habit titles each with an h-10 matcha "Selesaikan sekarang" button → `toggleHabit(id, todayISO())` + toast. Visibility = `missedYesterday(...)` filtered to habits NOT yet done today, so the card disappears implicitly when all are completed (no persistence).
- **c. Saran Coach (Goldilocks)**: for habits scheduled today, `goldilocksOf` advice rendered as compact strip cards (max 3): TrendingUp in matcha (`bg-secondary text-success`) for tone 'naik', Minimize2 in amber (`bg-gold/25 text-warning`) for 'kecilkan', title + text. Section hidden when no advice.
- **d. Arus Kas Hari Ini** → NEW `home-finance-card.tsx` (see below), placed after nudge/Saran Coach, before the bonus card.
- **e. Taman Pertumbuhan** → NEW `plant-garden.tsx` (see below), placed after Koleksi, just before the quote card (near bottom).
- Everything else preserved: DemoBanner, header shrink, hero progress, DateStrip, agenda grouping, Selesai fold, archive, bonus + anime.js gift, Insight pekan, PunchCard, Koleksi, XP economy, celebration.

### NEW: home-finance-card.tsx (audit item #11)
`HomeFinanceCard` — self-contained section (RutinaSectionHeader + RutinaCard 2xl shadow-soft, whileInView entrance):
- Metrics grid-3: **Uang keluar** (text-content-danger, TrendingDown), **Pemasukan** (text-success, TrendingUp), **Saldo bersih** (masuk − keluar; danger when negative) — all `formatIDR` full precision, tabular-nums.
- **Top 3 kategori pengeluaran** today as chips (CAT_META icon + label + `formatIDRShort` amount).
- **Transaksi hari ini**: max 3 rows (icon tile bg-pistachio/30 | bg-clay/25 matching Keuangan screen semantics, note + category/flow subtitle, +/− amount), each row tappable → `setScreen('keuangan')`; footer button "Lihat semua di Keuangan".
- Empty state: "Belum ada transaksi hari ini" with Wallet icon + friendly hint.
- `type === 'transfer'` excluded everywhere. Reuses `formatIDR`/`formatIDRShort` from finance/utils.ts and `CAT_META` from finance/cats.ts (read-only imports). Deviation note: I did NOT call `setFinPeriod` on row tap to avoid mutating the user's persisted finance filter — spec listed it as optional.

### NEW: plant-garden.tsx
`PlantGarden` — horizontal snap-scroll strip (role=list) of active habits: mini-card w-136px with big stage emoji (30px), truncated title, `stage.label · total/nextAt` (or "Tahap akhir"), thin h-1 progress bar (bg-primary fill, full at final stage, role=progressbar + aria). Footer caption lists the 5-stage ladder "Benih → Tunas → …". Section returns null when there are no active habits.

## Files
- Modified: `src/components/rutina-mobile/task-row.tsx`, `src/components/rutina-mobile/habit-sheet.tsx`, `src/components/rutina-mobile/screens/home.tsx`
- Created: `src/components/rutina-mobile/home-finance-card.tsx`, `src/components/rutina-mobile/plant-garden.tsx`

## Lint / type / runtime
- `bun run lint` (eslint .) → PASS, 0 errors 0 warnings project-wide. Targeted eslint on my 5 files → exit 0.
- `bunx tsc --noEmit` → the ONLY error is PRE-EXISTING in `store.ts:1586` (lead's migrate cast `p as RutinaState`, needs `as unknown as RutinaState`) — store.ts is on my do-not-touch list, flagging for the lead. None of my files have type errors.
- Dev server recompiled clean after changes (`GET / 200`, compile 694ms, no errors in dev.log).

## Store/coach API consumed (all as specced — nothing was missing)
`Habit.restDays/afterId/mini`, `HabitInput` new fields, `scheduleRestDay` (result.ok/error), `cancelRestDay`, `scheduledOn`, `restDayError` (indirect via store action), `dailyQuote`, `quoteSavedDate`, `PLANT_STAGES`, `plantStageOf`, `missedYesterday`, `goldilocksOf`, `triggerLabelOf`, `shortDateLabel`, `addDaysISO`, `todayISO`; finance/utils `formatIDR`, `formatIDRShort`; finance/cats `CAT_META`.

## Deviations & decisions (with reasons)
1. **TaskRow self-subscribes to the store** (habits/completions) instead of new props — keeps both existing call sites in home.tsx unchanged and the feature appears wherever rows render; plant/trigger info is informational, not parent state.
2. **"Versi 2 menit" action placed in the expanded area** (dashed secondary block above the action row) rather than the collapsed row — spec said keep the row compact and put extras in the expanded area; it sits directly beside/above "Tandai Selesai", i.e. near the complete button, visually secondary (ghost/dashed outline). Hidden when done/readOnly to avoid un-toggling.
3. **Nudge visibility filter** — `missedYesterday(...)` filtered by "not done TODAY"; otherwise the card could never disappear implicitly (completing today doesn't erase yesterday's miss). Matches the spec's "card disappears when all done".
4. **Rest days submitted from live habit state in edit mode** — prevents the draft save from reverting rest-day changes made through the immediate-action section while the sheet is open.
5. **Finance card placed after the agenda block** (nudge → Saran Coach → Arus Kas) rather than directly after the hero — keeps the primary habit-action area above the fold on mobile; spec allowed "before or after agenda, wherever it flows best".
6. Demo data note: seed completions are all done yesterday, so the nudge card is invisible in demo mode by design (it appears for real missed days); goldilocks 'kecilkan' advice does surface on some weekdays (e.g. "Jalan pagi 30 menit" mid-week), and "Arus Kas" shows the two seed transactions dated today.

## Notes for other agents
- `HomeFinanceCard` and `PlantGarden` are drop-in section components (self-subscribed); they can be reused on other screens (e.g. Stats) if desired.
- TaskRow now shows trigger chip / 2-minute action / plant stage in its expanded detail on ANY screen that renders it — currently only home.tsx does.
- store.ts:1586 has a pre-existing tsc cast error (see above) for whoever owns that file.
