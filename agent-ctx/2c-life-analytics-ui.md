# Task 2c — Life Analytics UI (stats.tsx + keuangan.tsx analytics)

Subagent: Task 2c (Life Analytics UI). Status: DONE (lint clean, verified in browser).

## Scope (files I own)
- `src/components/rutina-mobile/screens/stats.tsx` — add Kalender Aktivitas, Laporan Bulanan, Pekan Ini vs Pekan Lalu.
- `src/components/rutina-mobile/screens/keuangan.tsx` — add Peta Panas Pengeluaran + Temuan & Rekomendasi (tab Ringkasan).
- `src/components/rutina-mobile/finance/utils.ts` — extend with pure helpers only.
- NEW: `month-calendar.tsx`, `day-detail-sheet.tsx`, `spend-heatmap.tsx`.
- heatmap.tsx read for reference only (not edited).

## Key decisions (for later agents)
- New sections follow the LEAD design system (light cards): `RutinaCard` +
  `RutinaSectionHeader` + semantic tokens. Legacy dark-cocoa sections in
  stats.tsx are preserved untouched (screens not yet migrated).
- Month state is SHARED between Kalender Aktivitas and Laporan Bulanan (`viewYm`),
  clamped: prev disabled beyond Jan (current year − 2); next disabled beyond current month.
- Note date matching: `note.date` is a display label; matched via
  `Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'})` lowercased compare,
  plus `'hari ini'` only when iso == today. Helpers exported from `day-detail-sheet.tsx`
  (`notesOnDate`, `notesInWindow`, `noteDayLabel`) — reuse, do not duplicate.
- Pure finance helpers live in `finance/utils.ts`: monthRange, monthLabel, shiftMonthKey,
  monthFlow, monthSpend, monthSpendByCat, spendByDay — reuse from there.
- Spend heatmap ramp (matcha→amber, GitHub semantics): L0 border-only, L1 pistachio/40,
  L2 pistachio, L3 gold, L4 clay; thresholds relative to max day in window (25/50/75%).
- DayDetailSheet uses RutinaSheet with `max-h-[calc(100%-2rem)] flex flex-col overflow-hidden`
  and an internal scroll area (`overflow-y-auto no-scrollbar overscroll-contain`).

## Verification
- `bun run lint` → exit 0 (clean). `bunx tsc --noEmit` → only ONE pre-existing error in
  store.ts(1586) authored by lead (DO-NOT-TOUCH file); zero errors in my files.
- Headless browser (agent-browser) verified: stats sections render with real data; calendar
  day tap opens DayDetailSheet ("Rabu, 4 November 2026", "Kebiasaan — 3 dari 5 selesai",
  totals + tx rows); prev-month nav ("Oktober 2026"); keuangan heatmap cells + caption
  ("Sel, 3 Nov — Rp350.000 (1 transaksi)"); findings render; no console/page errors.

## Progress log
- [x] Read store.ts, stats.tsx, keuangan.tsx, finance/utils.ts, heatmap.tsx,
  rutina-card/section-header/sheet/empty-state/tabs, fin-chart, cats, layout-widths.
- [x] finance/utils.ts helpers (monthRange/monthLabel/shiftMonthKey/monthFlow/
      monthSpend/monthSpendByCat/spendByDay + DaySpend)
- [x] month-calendar.tsx
- [x] day-detail-sheet.tsx (+ note matching helpers)
- [x] spend-heatmap.tsx
- [x] stats.tsx sections (calendar + monthly report + week comparison)
- [x] keuangan.tsx sections (spend heatmap + findings)
- [x] lint clean + browser verification
