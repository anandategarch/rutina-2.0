# Task 3-d — Kebiasaan "Botanical Habit Garden" (Layout Grammar: garden)

Agent: kebiasaan-botanical-garden (Task ID 3-d)
Scope: `src/components/rutina-mobile/plant-garden.tsx` (variant prop only) + `src/components/rutina-mobile/screens/kebiasaan.tsx`. No other file touched (plant-glyph.tsx, habit-coach.ts, globals.css, store.ts, other screens read-only). Home's `<PlantGarden />` call site untouched (still default 'strip').

## PlantGarden variant API (plant-garden.tsx)

```tsx
export function PlantGarden({ variant = 'strip' }: { variant?: 'strip' | 'beds' })
```

- **'strip'** (default, Beranda): byte-identical behavior — horizontal snap-scroll filmstrip (`mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar pb-1`), 156px cards, root `mt-8`, plain RutinaSectionHeader. Home (home.tsx:1280) unaffected.
- **'beds'** (new, used by Kebiasaan):
  - **< xl**: classes are EXACTLY the strip classes → identical snap-scroll mobile UX (zero mobile regression).
  - **xl+**: same element becomes a planted bed — `xl:garden-bed xl:snap-none xl:overflow-x-visible xl:flex-wrap xl:p-4` (verified with a Tailwind 4.1.18 compile probe: custom `@utility` works under `xl:` variant, and `xl:p-4` (media query, emitted after base) correctly overrides base `pb-1`).
  - Cards keep existing styling + append `xl:w-[168px]` (PlantCard gained optional `bed` prop, default false).
  - Root drops its own `mt-8` in beds mode (the host section provides spacing).
  - Header ornament: lucide `Leaf` (18px, `text-module-accent-strong` → Rose Clay deep in Kebiasaan) beside the title via a `flex items-start gap-2` wrapper around the unchanged `RutinaSectionHeader` (`className="min-w-0 flex-1"`).
- Docblock extended with a "v2.9 Garden Beds" section documenting both modes.

## Changes in kebiasaan.tsx

| Line (final) | Change |
| --- | --- |
| 375–376 | Root gains `data-layout="garden"` (next to existing `data-module="kebiasaan"`) → `--layout-gap: 1.5rem`, `--layout-hero-radius: 1.5rem`. |
| 35 | New import `PlantGlyph` from `../plant-glyph`. |
| 409 | Empty-state section `mt-6` → `mt-[var(--layout-gap)]`. |
| 430–490 | **Summary strip → garden-bed metric strip**: one `garden-bed p-3.5 sm:p-4` surface with `grid grid-cols-3 gap-3 sm:gap-5`; the three RutinaCard wrappers removed; each tile = small glyph chip (h-8 w-8 rounded-full `bg-module-accent-soft text-module-accent-strong`) ABOVE the unchanged `RutinaMetric` (`mt-2`): Flame (Runtun terbaik) · Check (Selesai pekan ini) · **PlantGlyph stage="berbunga"** (Tanaman). Chip-above layout keeps mobile text width identical to before; per-tile `journalCard` stagger + `journalList` container preserved; values/labels/captions/trend untouched. |
| 494 | Saran Coach section `mt-6` → `mt-[var(--layout-gap)]`. |
| 583 | Agenda hari ini section `mt-6` → `mt-[var(--layout-gap)]`. |
| 706–713 | **Taman zone**: `<PlantGarden variant="beds" />` wrapped in `<section className="garden-surface mt-[var(--layout-gap)] rounded-[var(--layout-hero-radius)] p-3 sm:p-4 xl:p-5">`, guarded by `activeHabits.length > 0` (prevents an empty tinted zone when PlantGarden returns null). Outer wrapper intentionally unlabeled (PlantGarden's own `m.section aria-label="Taman Pertumbuhan"` remains the landmark). |
| 716 | Semua kebiasaan section `mt-6` → `mt-[var(--layout-gap)]`. |
| 734 | Split gap `xl:gap-5` → `xl:gap-[var(--layout-gap)]` (structure 7/5 untouched — aside sticky detail panel byte-identical). |
| 745 | Category group heading gains clay bed-marker: `border-l-2 border-module-accent pl-2.5` on the existing heading row (cat-color dot, count badge, interactions unchanged). |

Notes:
- All `mt-6` → `mt-[var(--layout-gap)]` conversions are value-identical (1.5rem) — pure token semantics, zero visual shift.
- Kept as-is (deliberate): summary strip `mt-4` (hero coupling to header), internal `mt-4`/`mt-6` inside sections (done-fold, coach list, archive fold), CTA `mt-8`.
- Summary strip uses semantic lucide icons (Flame/Check — same motifs as the detail panel metrics) + PlantGlyph only on the plant metric, per "do not force PlantGlyph where it looks off"; it previously used NO icons at all.

## Constraint compliance

- No new constant/infinite animations (milestone growth via usePlantGrowth untouched); no new animation code at all — only existing variants reused. Reduced-motion respected (AppMotionProvider + anime.js guard unchanged).
- Earth tones only: all new tints via `--module-accent*` (Rose Clay in kebiasaan context) / `garden-bed` / `garden-surface`. No blue/indigo.
- 44px touch targets: no interactive element resized (strip is non-interactive cards).
- Indonesian copy unchanged everywhere.

## Verification

- `bun run lint` → PASS (exit 0, zero errors/warnings).
- `bunx tsc --noEmit` → PASS (exit 0).
- Tailwind compile probe (postcss + @tailwindcss/postcss against the real globals.css): `garden-bed`, `xl:garden-bed`, `garden-surface`, `mt-[var(--layout-gap)]`, `rounded-[var(--layout-hero-radius)]`, `xl:overflow-x-visible`, `xl:snap-none`, `xl:flex-wrap`, `xl:w-[168px]` all emit; cascade order confirmed (`base pb-1` before media-query `xl:p-4` → bed padding wins at xl).
- dev server: `GET / 200`, `✓ Compiled` clean, no errors in dev.log after edits.
- Home screen call site re-verified: `<PlantGarden />` (default strip).

## Manual verification recipe

Desktop (≥1280px) → tab Kebiasaan: summary strip is now a rose-tinted bed with three glyphed metrics; "Taman Pertumbuhan" is a misted botanical zone (rounded 24px) whose plants wrap as a bed grid (168px cards, ~5/row at 1080px content width) with a leaf beside the title; category headings show a clay tick; split list/panel gap is 24px. Below xl (incl. phones): Taman is the same misted zone containing the familiar snap-scroll strip; summary bed shows 3 metrics with full-width text (2 cards visible on 390px screens); everything else pixel-identical to before.
