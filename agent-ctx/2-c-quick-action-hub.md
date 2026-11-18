# Task 2-c — Global Quick Action Hub (Rutina 2.0)

Agent: Z.ai Code (quick-action-hub agent)
Status: COMPLETE — scoped ESLint passes (0 errors/warnings), dev server compiles clean, browser-verified at 390px mobile and 1440px desktop.

## What was built

A single global action center reachable from every screen: a floating action button (FAB) plus a cmdk-powered hub that doubles as a universal search (features, habits, notes, transactions), and a dedicated Check-in bottom sheet (mood / energy / sleep).

## Files

### Created
- `src/components/rutina-mobile/quick-action-hub.tsx`
  - **`useQuickHub`** — module-level zustand store `create<QuickHubState>()(...)` exporting `{ open, openHub(), closeHub(), toggleHub() }` (module-level so FAB, keyboard shortcuts, and future triggers like a desktop-sidebar button can all toggle it; pattern mirrors `journal-ui.ts`).
  - **`QuickActionHub`** — the overlay. Mobile (< sm): bottom drawer, `rounded-t-sheet`, `max-h-[82dvh]`, drag-to-dismiss handle (`drag="y"` + `useDragControls` + `dragElastic {top:0,bottom:0.55}`, close on offset.y>90 || velocity.y>600 — verbatim RutinaSheet behavior). Desktop (sm+, via `matchMedia('(min-width: 640px)')`): centered dialog, `max-w-md` (448px), `rounded-2xl`, `shadow-ink-deep`, fade/scale entrance. Backdrop `bg-black/35 backdrop-blur-[2px]`, tap closes. Backdrop z-[65] / panel layer z-[66] — above all sheets (z-50) and design board (z-60), below JournalCanvas full-screen writing mode (z-70) and splash (z-70), so ⌘K during writing mode correctly does nothing visual. AnimatePresence mount/unmount, Escape closes, focus returns to the trigger on close. `role="dialog" aria-modal="true" aria-label="Aksi cepat"`.
  - **`QuickActionFab`** — exported from the same file, mounted in rutina-app. 56px (h-14 w-14) rounded-full, `bg-primary text-primary-foreground shadow-lift`, Plus icon rotates 45° when open (`m.span` + `motionTokens.spring.snappy`), `whileTap scale 0.92`, `aria-label="Aksi cepat"` + `aria-expanded` + `aria-haspopup="dialog"`, z-30 (dims behind sheet backdrops naturally). Pops in/out via AnimatePresence when entering/leaving Profil.
  - Keyboard (window listener, always mounted in app phase): **⌘K / Ctrl+K** toggles (preventDefault); **"/"** opens when the event target is not input/textarea/select/contentEditable.
- `src/components/rutina-mobile/checkin-sheet.tsx`
  - **`useCheckInSheet`** module-level zustand store `{ open, openCheckIn(), closeCheckIn() }` — opened by the hub's Check-in action.
  - `CheckInSheet` built on the reusable **`RutinaSheet`** wrapper (drag, backdrop, Escape, focus trap for free). Header = `RutinaSectionHeader` (eyebrow "Suasana & pemulihan", title "Check-in hari ini"). Body: MOODS pill chips (icons Laugh/Smile/Meh/BatteryLow matching journal-canvas; selected `bg-primary text-primary-foreground`, unselected `bg-surface-secondary`; flex-1 so all 4 fit one row on 390px), 5-circle energy selector 1–5 with caption "1 = sangat lelah · 5 = bugar", sleep stepper 0–14 h step 0.5 with −/+. Simpan (RutinaButton primary block): `setMood(draft)` only if a mood is picked (otherwise existing mood is kept), `logBodyCheckIn({ sleepH, energy })` with undefined for untouched fields (store only writes provided fields), `toast.success('Check-in tersimpan — terima kasih sudah merawat dirimu.')`, close. Prefills from `mood` + `bodyLogs[todayISO()]` using the render-time prevOpen reset pattern (FoodSheet pattern, lint-safe).

### Modified
- `src/components/rutina-mobile/rutina-app.tsx` — imports + 3 mount lines only: `<QuickActionFab />` after `<BottomNav />` (inside the `phase === 'app'` fragment, so it never shows during splash), `<CheckInSheet />` + `<QuickActionHub />` alongside the other sheets. No other logic touched.

## Hub contents

- **Search row**: raw `CommandPrimitive.Input` (cmdk) + Search icon, placeholder "Cari aksi, catatan, kebiasaan…". Reuses shadcn `src/components/ui/command.tsx` primitives for everything else (Command root, CommandList, CommandGroup, CommandItem, CommandEmpty) with token-styled overrides (`py-2.5 rounded-lg text-[13.5px]`, selected = `bg-accent` mist). The raw Input was needed because shadcn's CommandInput hard-codes an h-9/px-3/border-b wrapper that can't match the drawer's design.
- **Empty query** → 3-col grid of the six primary actions as cards (soft tinted icon circle + label, `active:scale` via whileTap, stagger entrance `delay: 0.03*i` with spring.snappy) + muted hint "Ketik untuk mencari di seluruh aplikasi". Grid collapses with a height:auto→0 AnimatePresence animation when typing starts:
  - Kebiasaan (Target, `bg-secondary text-success`) → `openHabitCreate()`
  - Catatan (PenLine, `bg-surface-secondary text-content-secondary`) → `openCompose()`
  - Transaksi (Wallet, `bg-gold/30 text-warning`) → `openTxSheet()`
  - Latihan (Dumbbell, `bg-clay/25 text-terracotta`) → `openWorkoutSheet()`
  - Asupan (UtensilsCrossed, `bg-primary/15 text-matcha-deep`) → `openFoodSheet()`
  - Check-in (HeartPulse, `bg-espresso/10 text-espresso`) → `useCheckInSheet.getState().openCheckIn()`
- **Non-empty query** → cmdk-filtered groups (mount only when query non-empty; groups with no matches auto-hidden by cmdk):
  - "Aksi": the 6 actions (keyword-rich `value`s, e.g. "transaksi baru catat uang pemasukan pengeluaran keuangan") + "Buka Beranda/Bugar/Keuangan/Jurnal/Statistik" nav items → `setScreen(...)`.
  - "Kebiasaan": non-archived habits, cat-color dot + title, right hint = category → `setScreen('beranda')` + `openHabitEdit(id)`.
  - "Catatan": all notes, right hint = folder (FOLDER_SHORT) → `openReading(id)`.
  - "Transaksi": pre-filtered by note/cat `includes(query)`, then **newest 6 of the matches** (this implements "filtered by title, newest 6" while still finding old transactions — e.g. "gaji" finds the 1st-of-month salary tx that a plain newest-6 slice would miss); row shows type icon (ArrowUpRight pistachio / ArrowDownRight clay / ArrowLeftRight muted, matching Keuangan) + note + `+Rp…/−Rp…` (formatIDR) → `setScreen('keuangan')`.
  - `Command.Empty` → calm "Tidak ditemukan" + "Coba kata lain — aksi, catatan, kebiasaan, atau transaksi."
- **Footer**: "Esc untuk menutup" (hidden sm:block, desktop only) + "rutina." wordmark (dot in text-primary), safe-area padded on mobile.
- All actions follow the closeHub-then-run pattern (`onSelect`/onClick → `closeHub(); fn()`).

## FAB bottom offset (verified)

`bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 lg:bottom-6 lg:right-6`. Measured at 390x844 (safe-area 0): BottomNav top = 771px, nav height 73px; FAB bottom edge = 760px → **11px clearance above the nav**; the calc's env() term grows in lockstep with the nav's `pb-[max(env(safe-area-inset-bottom),10px)]` on notched devices, so the gap is preserved (≥11px). At 1440x900 (lg+): nav hidden, FAB hugs the app surface bottom-right (24px inset from the RutinaApp container edge, which itself sits inside main's xl:p-8 padding). FAB completely absent on Profil (verified: `fabPresent: false`), returns after "Kembali".

## Motion (token-governed)

Panel slide-up = `motionTokens.spring.sheet` (340/34 — the governed sheet spring; brief's "~380/34" guidance satisfied by the existing token per governance rules). Desktop palette = duration.fast + easing.entrance. Card stagger = spring.snappy + `delay: i * 0.03` (whileTap carries its own undelayed spring so tap feedback is instant). FAB pop/rotate = spring.snappy. Reduced motion handled globally by AppMotionProvider.

## Deliberate deviations (with reason)

1. **`rounded-t-sheet` (28px) instead of brief's `rounded-t-3xl` (24px)** — the design system's governance scale defines sheet radius 28 and every other bottom sheet uses it; consistency wins (visually near-identical).
2. **Desktop-only autofocus of the search input** — on mobile, autofocusing pops the keyboard over the six-action grid (the drawer's whole purpose). Mobile focuses the panel itself (tabIndex -1, Escape works); sm+ focuses the input. Brief said "focus the search input on open"; implemented where it makes sense.
3. **Transactions: pre-filter all txs then take newest 6 matches** instead of mounting only the newest 6 txs — keeps search universal (product direction: "find features, notes, habits, or transactions") while honoring the 6-item display cap.
4. **Grid hides when query is non-empty** (brief allowed "always below the grid") — gives results full space; the six actions remain reachable as "Aksi" group rows while searching.
5. Mood chips use flex-1 (single row) after VLM review flagged the 2-row wrap ("Lelah" orphaned) on 390px.
6. Check-in sleep stepper range 0–14 per brief (note: fitness tubuh-panel caps at 12 — the two coexist by design of their respective briefs).

## Validation

- Scoped ESLint on quick-action-hub.tsx, checkin-sheet.tsx, rutina-app.tsx: **PASS** (exit 0, no warnings). Re-run after the mood-chip tweak.
- `bunx tsc --noEmit`: only the PRE-EXISTING sync-engine.ts BodyLogs error (owned by another wave, documented in 2-a's report); zero errors in my files.
- Dev server: clean compiles, `GET / 200`, `PUT /api/state 200`, no errors in dev.log.
- Browser-verified (agent-browser, 390x844 + 1440x900):
  - FAB geometry clears bottom nav (11px gap); FAB absent on Profil; aria-expanded toggles.
  - Hub opens via FAB, ⌘K (Ctrl+K), and "/"; Escape closes; focus returns to FAB (verified `document.activeElement === fab`).
  - Six cards each open the right sheet: "Tambah kebiasaan baru", "Buat catatan baru", "Tambah transaksi", "Catat sesi latihan", "Tambah asupan makanan", "Check-in hari ini".
  - Search: "gaji" → single tx result "Gaji bulan November +Rp8.500.000" (green), non-matching groups hidden; "zzzz" → "Tidak ditemukan" empty state; "ritual" → note "Ritual Pagi yang Tenang" (Pribadi) → opens ReadingSheet; "kosakata" → habit → Beranda + "Sunting kebiasaan" sheet; tx select → Keuangan screen.
  - Check-in flow: picked Baik + energi 4 + sleep 8h → toast exact copy, sheet closed, persisted `mood: "Baik"`, `bodyLogs[today] = { water: 0, sleepH: 8, energy: 4 }`.
  - Hub layers above an open tx sheet (z 66 > 50).
  - VLM visual review of mobile hub, mobile search results, desktop palette, and check-in sheet: clean, earth-tone, no overlap/cutoff/misalignment.

## Notes for other agents

- `useQuickHub` (quick-action-hub.tsx) and `useCheckInSheet` (checkin-sheet.tsx) are the public hooks for opening the hub / check-in from anywhere (e.g. a desktop sidebar button): `useQuickHub.getState().openHub()`.
- Hub z-order: backdrop z-[65], panel z-[66] — above sheets (z-50) and design board (z-60), below JournalCanvas (z-70). Do not add overlays at z-[65..66].
- The "/" and ⌘K shortcuts are guarded against text inputs; safe alongside the 1–6 screen shortcuts in app-frame.
- store.ts, sync-engine.ts, screens/*, finance/*, fitness/*, journal-canvas.tsx, desktop-sidebar.tsx, context-rail.tsx, app-frame.tsx, globals.css, bottom-nav.tsx: untouched.
