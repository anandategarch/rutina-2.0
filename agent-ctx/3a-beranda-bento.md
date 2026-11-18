# Task 3-a — Beranda Bento Composition (Rutina 2.0)

Agent: 3-a (Beranda desktop bento grid)
Date: 2026-11-18
Scope: `src/components/rutina-mobile/screens/home.tsx` ONLY (1216 → 1324 lines). All other files untouched (rutina-bento.tsx, rutina-metric.tsx, globals.css, store.ts, other screens read-only).

## What changed

Desktop (xl+) top of Beranda is now composed of TWO `RutinaBentoGrid` blocks (12-col xl / 6-col sm / 1-col mobile). Mobile keeps its exact previous section order plus one new card.

### Grid 1 — hero composition (replaces the standalone hero section)

- Wrapper: `m.div` fade `opacity 0→1, y 14→0`, `motionTokens.duration.enter` + `easing.standard`, `delay 0.05`, `className="mt-4"` (mt-4 moved here from the old hero m.section).
- `RutinaBentoItem span="hero"` (8 cols xl / 6 sm): the EXISTING hero progress card verbatim (HomeProgressRing + "X dari Y misi" + streak/level chips + XP progressbar). Only wrapper-level tweaks: m.section keeps its own fade (0.55s, y 22), gains `h-full`; RutinaCard gains `h-full` alongside `shadow-soft` so the tile fills the grid row. Inner content byte-identical (incl. `sm:mx-auto sm:max-w-[600px]` cap).
- `RutinaBentoItem span="feature"` (4 cols xl / 6 sm): NEW "Insight hari ini" card — `<section aria-label="Insight hari ini" className="h-full">` > `RutinaCard` (variant default, density comfortable, radius 2xl, `h-full shadow-soft`) containing:
  - `RutinaSectionHeader title="Insight hari ini"` (no eyebrow/description/action)
  - 3 `RutinaMetric` rows, `size="sm"`, stacked `space-y-4`:
    1. "Streak berjalan" — `{streak} hari`, icon `Flame`, chip `bg-module-accent/15 text-module-accent-strong` (matcha default — Beranda has no data-module)
    2. "Misi pekan ini" — `weekMissions` (number), icon `Timer`, chip `bg-cocoa/10 text-content-secondary`
    3. "Saldo bersih" — `formatIDRShort(net)`, negative rendered `−{formatIDRShort(-net)}` (typographic minus, same convention as keuangan.tsx net chip), icon `Wallet`, chip `bg-gold/25 text-warning`
  - Always rendered (0 values are valid).

### DateStrip — untouched, still directly after the hero area

Position/behavior identical (sticky top-0, z-30, drives selectedDate).

### Grid 2 — agenda + coach column

- Wrapper: `m.div` fade same tokens, `delay 0.13`, no top margin (agenda section keeps its own `mt-6`).
- `RutinaBentoItem span="wide"` (8 cols xl / 6 sm): the EXISTING "Agenda hari ini" section verbatim (header, past/future context ribbon, pending groups Pagi/Siang/Malam/Kapan saja, "Selesai" fold, dashed add row, archive fold). Only re-indented.
- `RutinaBentoItem span="feature"` (4 cols xl / 6 sm): the EXISTING "Pengingat jangan bolong dua kali" (aria-label preserved) and "Saran Coach" (aria-label preserved) sections stacked, still individually conditional (`missedList.length > 0` / `coachTips.length > 0`). Both keep their own m.section fades and `mt-6`. When both are empty the column renders an empty div (invisible, collapses).
- Verified before splitting: agenda → pengingat → coach were directly consecutive in DOM (nothing between), so the wide/feature pairing preserves overall DOM order exactly.

### Everything after — untouched, full width

HomeFinanceCard ("Arus kas hari ini"), Bonus harian, Insight pekan (FocusWidget + StreakWidget), PunchCard, Koleksi folders, PlantGarden, Refleksi quote card — all byte-identical.

## Final section order (top → bottom)

1. DemoBanner + header greeting (scroll-shrink) — unchanged
2. **Grid 1**: [hero] Progres hari ini · [feature] Insight hari ini (NEW)
3. DateStrip (Kalender dua pekan, sticky)
4. **Grid 2**: [wide] Agenda hari ini · [feature] Pengingat jangan bolong dua kali + Saran Coach
5. HomeFinanceCard (Arus kas hari ini)
6. Bonus harian → 7. Insight pekan → 8. PunchCard → 9. Koleksi → 10. PlantGarden → 11. Refleksi

Mobile (1-col): hero → insight card → DateStrip → agenda → pengingat → coach → finance → … (previous order + the new insight card between hero and DateStrip — sanctioned by spec).

## Data derivations used

- `streak` — existing `bestStreak(habits, completions, today).streak` (reused, not recomputed).
- `weekMissions` — NEW module-level helper `weekTotalDone(c: Completions, iso: string)` next to the existing `weekDoneCount`: iterates `weekStartISO(iso)` (home.tsx local helper, same logic as store's export) to `iso` inclusive, summing `doneCountOn(c, cursor)`. Called as `weekTotalDone(completions, today)`. Plain render-scope const (no useMemo, same style as `doneToday`/`pct`) — React Compiler memoizes; no callbacks capture it, so no `preserve-manual-memoization` risk.
- `netSaldo` — `txs.reduce(...)`: `+amount` for `type === 'masuk'`, `-amount` for `'keluar'`, `0` for `'transfer'` (transfer is not cash flow — same philosophy as finance/utils `accumulate`/`totalSaldo`). All txs, no date filter (per spec). `txs` via new subscription `useRutina((s) => s.txs)`.
- `formatIDRShort` imported from `../finance/utils` (same path keuangan.tsx uses).

## Technical notes

- Icons added to lucide import: `Timer`, `Wallet` (`Flame` already present). New imports: `RutinaBentoGrid`/`RutinaBentoItem` (../rutina-bento), `RutinaMetric` (../rutina-metric), `formatIDRShort` (../finance/utils).
- `h-full` added to hero m.section + both RutinaCards so bento tiles in one grid row align at the bottom (xl). Content of hero unchanged — wrapper-level class only.
- All existing `m.*` animations intact (hero fade, group stagger, done-fold AnimatePresence, chevron rotations, bonus pulse + anime.js gift burst, whileInView below fold). The two new grid wrappers add the sanctioned subtle fade (enter token, delays 0.05 / 0.13).
- A11y: grid wrappers are plain (motion) divs; all inner sections keep their aria-labels; new insight section carries `aria-label="Insight hari ini"`. No new interactive elements (no 44px concerns).
- No functionality removed: demo banner, avatar→profil, DateStrip browsing, agenda toggle/fold/archive, pengingat "Selesaikan sekarang", coach tips, finance card, bonus claim, quote save, folder actions, PlantGarden all present.

## Lint / typecheck

- `bun run lint` → exit 0, zero errors/warnings.
- `bunx tsc --noEmit` → exit 0, zero errors (no new errors).
- No dev server started/stopped, no build run.

## Notes for other agents

- Beranda is the first consumer of `RutinaBentoGrid`/`RutinaBentoItem`; pattern to copy: `m.div` fade wrapper → `RutinaBentoGrid` → `RutinaBentoItem span=…` → section (aria-label) → card with `h-full` for row alignment.
- `weekTotalDone` (module-level in home.tsx) is the all-habits variant of `weekDoneCount`; if stats screens need weekly totals, consider promoting it into store.ts later.
- Insight tile's "Saldo bersih" is ALL-TIME net flow (masuk − keluar, transfers excluded), deliberately different from HomeFinanceCard's TODAY net ("Arus Kas Hari Ini") — no duplication of semantics.
