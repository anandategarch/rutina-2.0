# Task 2-a — Responsive Desktop Shell (Rutina 2.0)

Agent: Z.ai Code (desktop shell agent)
Status: COMPLETE — all scoped lint/type checks pass, verified in browser at 390px / 1100px / 1440px.

## What changed

### Created
- `src/components/rutina-mobile/desktop-sidebar.tsx`
  Desktop sidebar (`hidden lg:flex`, w-60, `border-r border-border bg-surface-primary`).
  Wordmark "rutina." (dot in `text-primary`) + "Personal Life System" caption; 6 nav items
  (Beranda/Bugar/Keuangan/Jurnal/Statistik/Profil with Home/Dumbbell/Wallet/BookOpen/BarChart3/User
  lucide icons). Active item: `bg-secondary` pill animated with `layoutId="nav-pill-desktop"`
  (`m.span`, `motionTokens.spring.snappy`), icon `text-primary`, label bold `text-content-primary`;
  inactive `text-content-muted` with `hover:bg-surface-secondary`. Bottom: sync card
  (CloudCheck icon, "Tersinkron cloud", "Data tersimpan otomatis") + "Rutina 2.0" version caption.
- `src/components/rutina-mobile/context-rail.tsx`
  Right context panel (`hidden xl:flex`, w-72, `border-l border-border bg-surface-primary/60`,
  own `overflow-y-auto`, stacked cards gap-4, gentle staggered entrance using
  `motionTokens.duration.enter` + `easing.standard`). All data REAL via useRutina selectors:
  - "Ringkasan pekan ini" (RutinaSectionHeader + RutinaCard): misi = sum
    `dayCounts(completions, today, 7)`; streak = `bestStreak(habits, completions, today).streak`;
    saldo = `formatIDRShort(masuk - keluar)` (transfers excluded). Clean flat MetricRows
    (icon + value + label) — no floating/tilted cards.
  - "Berikutnya": next habit from `habitsOn(habits, today)` with `reminder "HH:MM" > now`,
    sorted ascending (type-guard `isReminderAhead`); shows time + title + category dot
    (HABIT_CAT_COLORS). Empty calm state: "Semua misi hari ini telah dijadwalkan."
  - "Tips": static tip with Leaf icon.

### Modified
- `src/components/rutina-mobile/app-frame.tsx` — REWRITTEN. Now `'use client'`.
  Responsive shell: outer `h-dvh w-full overflow-hidden bg-background`; inner
  `mx-auto h-full max-w-[1600px] lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-1
  xl:grid-cols-[auto_minmax(0,1fr)_auto]` holding `<DesktopSidebar />`, `<main>`, `<ContextRail />`
  as siblings of ONE `<RutinaApp />` instance (CSS-driven layout, no duplication).
  `<main>` is `relative h-full min-w-0 overflow-hidden lg:p-6 xl:p-8` with two ambient blobs
  (`bg-secondary/60`, `bg-surface-secondary`, blur-3xl, aria-hidden, `hidden lg:block`).
  NO phone bezel / rounding / frame — app fills the padded main area. Below lg: zero padding,
  full-bleed app. Also adds `useDesktopScreenShortcuts()`: keys 1-6 switch screens, guarded by
  `matchMedia('(min-width: 1024px)')`, meta/ctrl/alt check, and input/textarea/select/contenteditable
  target check. Doc comment fully rewritten to describe the native desktop direction.
- `src/components/rutina-mobile/bottom-nav.tsx` — added `lg:hidden` to root `<nav>` (bottom nav is
  mobile-only; desktop uses sidebar). Header comment updated. Nothing else touched
  (layoutId="nav-pill", styles, behavior identical).
- `src/components/rutina-mobile/rutina-app.tsx` — comment-only change at the `<BottomNav />` render
  site documenting that on lg+ the tab bar is hidden and navigation moves to the sidebar rendered
  by app-frame outside this component. No functional change (per the brief's recommended
  restructure, sidebar/rail live OUTSIDE RutinaApp; rutina-app needs no structural edits).

### Deleted
- `src/components/rutina-mobile/desktop-stage.tsx` (old marketing stage: BrandPanel + WidgetRail +
  phone bezel). Verified via ripgrep that no file referenced it before deletion.

## Final lg+ structure

```
<div h-dvh w-full overflow-hidden bg-background>
  <div mx-auto h-full max-w-[1600px]
       lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-1
       xl:grid-cols-[auto_minmax(0,1fr)_auto]>
    <DesktopSidebar />        // lg: auto col  (w-60 = 240px)
    <main>                    // lg: minmax(0,1fr), p-6 (xl: p-8), ambient blobs, <RutinaApp/> h-full
    <ContextRail />           // xl: auto col  (w-72 = 288px) — hidden at lg
  </div>
</div>
```
Below lg the container is a plain block; sidebar/rail are `display:none` and `<main>` has no
padding, so RutinaApp is exactly full-bleed (mobile fullscreen fix preserved).

## Deviations from the brief (and why)

1. Added `lg:grid-rows-1` (grid-template-rows: minmax(0,1fr)) to the grid container — guarantees
   the single row equals container height so `h-full` resolves deterministically in all browsers.
2. Ambient blob wrapper is `hidden lg:block` — mobile never paints them (they are covered by the
   app anyway; zero paint cost on phones).
3. rutina-app.tsx received a comment-only edit (brief's "RECOMMENDED RESTRUCTURE" path) — the
   functional change (hiding bottom nav on lg) lives in bottom-nav.tsx as the brief prefers.
4. Saldo in the rail excludes `transfer` txs (brief says "masuk minus keluar"; store also documents
   transfers as excluded from cash-flow stats). Old WidgetRail had subtracted them — not carried over.
5. Sync card is static text — sync-engine exposes no reactive status (only `syncStatus()` helper);
   brief specified static copy ("Tersinkron cloud") anyway.
6. Desktop pill spring uses `motionTokens.spring.snappy` (420/32) instead of bottom-nav's inline
   420/34 — visually identical, but token-governed per motion governance rules.

## Validation

- Scoped ESLint on all 5 files (app-frame, desktop-sidebar, context-rail, rutina-app, bottom-nav):
  PASS, zero warnings/errors.
- `bunx tsc --noEmit`: zero errors in my files. (One pre-existing project error in
  `sync-engine.ts` BodyLogs typing — belongs to the concurrent fitness agent, not touched by me.)
- Dev server (running on :3000): compiles clean, `GET / 200`.
- Browser-verified geometry:
  - 1440x900 (xl): sidebar x=0 w=240; main x=240 w=912 h=900; rail x=1152 w=288; bottom nav
    display:none; main padding 32px; doc height == viewport (no scroll).
  - 1100x800 (lg): sidebar visible; rail display:none; main padding 24px.
  - 390x844 (mobile): main x=0 y=0 w=390 h=844, padding 0px — full-bleed; bottom nav visible;
    sidebar/rail display:none; no page scroll.
  - Keyboard: pressing "3" at desktop switched to Keuangan (aria-current + heading "Arus Kas");
    pressing "1" returned to Beranda.
- VLM visual review of desktop-xl and mobile screenshots: sidebar/rail/cards/pill all correct,
  earth-tone palette, no overlap/misalignment, mobile confirmed edge-to-edge with no frame.

## Notes for other agents

- Do NOT re-introduce a phone bezel on desktop; the desktop presentation is now a native
  3-column app shell. `RutinaApp` fills the main column and keeps its own CONTENT_W centering.
- Sheets/overlays rendered inside RutinaApp cover only the main column on desktop — by design.
- Keyboard 1-6 screen shortcuts are active on lg+ (guarded against text inputs).
- store.ts, sync-engine.ts, screens/*, finance/*, fitness/*, API routes, globals.css untouched.
