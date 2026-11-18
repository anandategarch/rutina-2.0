# Task 2-e — Immersive Workout Mode (Rutina 2.0 Bugar screen)

Agent: Z.ai Code (immersive workout session mode)
Date: 2026-11-18
Status: COMPLETE — scoped ESLint clean (exit 0, 0 problems), `tsc --noEmit` 0 errors in scoped files, full flow verified in browser (390px) end-to-end.

NOTE for concurrent agents: the dev server Fast-Refreshes the whole app tree when
any of us saves a file. That is why screens may remount mid-testing and the persisted
`screen` may restore to another tab. It is environment noise, not a bug.

## Files

### Created
- `src/components/rutina-mobile/fitness/session-store.ts`
  Separate NON-persisted zustand store for the in-flight session (NOT in store.ts, so it
  survives BugarScreen unmount on tab switches; intentionally memory-only — an unsaved
  session never enters history/sync). Models: `SessionSet {weight,reps}`,
  `SessionExercise {id,name,kind,targetSets,sets,hintWeight,hintReps}`,
  `ActiveSession {startedAt,exercises,currentIdx,restingUntil,restDuration}`.
  Actions: `startSession(items)`, `addExercise(item)`, `completeSet(weight,reps)`
  (pushes set + starts 90s rest), `nextExercise/prevExercise/goToExercise`,
  `skipRest`, `extendRest(sec)` (extends restingUntil AND restDuration so the progress
  bar stays proportional), `endSession()` → returns `WorkoutInput | null` (kind 'beban',
  date todayISO, duration = elapsed minutes, sets flattened exercise-by-exercise; null
  when no sets), `reset()`. Exported helper `startSeededSession(seed, workouts)` maps
  `WorkoutSeed[]` (program days) to session items using `exStatOf` hints.
  `SESSION_REST_MS = 90_000`.
- `src/components/rutina-mobile/fitness/workout-session.tsx`
  - `WorkoutSessionOverlay` (exported): reads session-store; `AnimatePresence` mounts
    `SessionView` while a session is active + renders `SessionCelebration`.
  - `SessionView`: fullscreen **fixed inset-0 z-[70]** immersive DARK surface
    (`bg-hero-surface` espresso — stays dark in light AND dark theme, unlike
    `bg-surface-inverse` which inverts; `text-hero-content/-muted/-accent`,
    `bg-hero-surface-raised`, `bg-pistachio`/`text-espresso` accents). Covers bottom nav.
    Top thin progress bar (role=progressbar, done/target sets). Header "SESI LATIHAN"
    small-caps + pulsing dot "Sedang berlangsung"; right "Akhiri" button — turns gold
    "Akhiri & Simpan" + animate-pulse-soft when ALL target sets done. Scrollable exercise
    chips (current = pistachio, done = check, "n/target", auto scrollIntoView) + dashed
    "Tambah" chip. Main card: kind label + "Set {n} dari {target}", playfair exercise
    name, EX_LIB meta (muscle · equipment · level), Beban stepper (step 2,5 kg, 56px
    buttons, 0–500) & Repetisi stepper (step 1, 1–100), caption
    "Set sebelumnya: 55 kg × 8" (last set this session → else "(sesi lalu)" from history
    hints → else "Set pertama…"), logged-set pills, swipe hint. Navigation: swipe
    (m.div drag="x", dragConstraints {0,0}, elastic 0.16, onDragEnd threshold 60px),
    prev/next buttons with exercise names, keyboard ArrowLeft/Right; direction-aware
    slide on exercise change (keyed remount, dir state — NOT ref, react-hooks/refs rule).
    Empty session ("Latihan kosong"): centered empty state + "Tambah gerakan" → inline
    `AddExercisePanel` (grouped native select, target-set stepper, Batal/Tambahkan;
    duplicate name guarded with toast). Steppers prefill via render-time adjust pattern
    (react-hooks/set-state-in-effect compliant): last set → hintWeight/hintReps → 20/8.
  - `RestCard`: AnimatePresence card when `restingUntil != null`; big mono (font-mono)
    tabular-nums "01:30" countdown (interval 250ms, `Math.ceil` seconds), depleting bar
    (remaining/restDuration), gold + pulsing when ≤5s, "15 dtk" (+15) and "Lewati"
    buttons; at 0 → skipRest + toast "Istirahat selesai — ayo lanjut!" (fires on remount
    too if timer expired while away).
  - SET SELESAI: h-14 matcha CTA → completeSet; toasts: exercise target reached →
    "geser ke gerakan berikutnya"; ALL targets reached → skipRest + "Semua set selesai —
    akhiri & simpan sesimu." + Akhiri highlight.
  - Exit: "Akhiri"/Escape → `RutinaDialog` "Akhiri sesi latihan?" body adapts (n set
    akan disimpan / belum ada set), actions "Simpan & akhiri" (only when sets exist;
    endSession → **addWorkout** (SAME store action as WorkoutSheet → triggers sync
    engine; no direct API writes) → toast + `SessionCelebration`) / "Lanjutkan" (dismiss)
    / "Buang sesi" (destructive, reset + toast).
  - `SessionCelebration`: z-[75] fixed dark layer, trophy card "SESI LATIHAN TERSIMPAN",
    big set count, Tonase/Durasi/Gerakan stats. **anime.js v4 ONLY here** — `createScope`
    + `createTimeline` + `stagger` with `mediaQueries reduceMotion` (durations → 1ms),
    `scope.revert()` on cleanup, element targets queried from root (splash.tsx pattern);
    auto-dismiss 2600ms (1000ms reduced-motion). Verified in browser: "SESI LATIHAN
    TERSIMPAN 3 set 600 kg TONASE 4 mnt DURASI 2 GERAKAN".
  - `SessionPickerSheet` (exported): bottom sheet (fixed z-[65] backdrop + panel,
    drag-to-dismiss handle, useFocusTrap, Escape) opened from Bugar. "Cepat Mulai"
    chips = recent exercises from real workout history (name + last "60×8", toggle into
    plan; hint card when no history), grouped "Tambah Gerakan" select (dedupe toast),
    plan rows (muscle/equipment caption, target-set stepper 1–12, Trash2 remove),
    CTA "Mulai Sesi · n gerakan" (disabled when empty), secondary "Batal" +
    "Latihan kosong" (starts empty immersive session).
  - Re-exports `SESSION_REST_MS`, `startSeededSession` for bugar.tsx.
  - Conventions: `import * as m from 'motion/react-m'` (never motion.*), APIs from
    'motion/react', `motionTokens` everywhere, no blue/indigo, all text Bahasa
    Indonesia, 44px+ targets (steppers 56px), cursor-pointer, active:scale, focus-visible
    rings, tabular-nums, no emojis.

### Modified
- `src/components/rutina-mobile/screens/bugar.tsx` (only file modified)
  - Primary CTA relabeled "Catat Sesi Latihan" → **"Mulai Sesi Latihan"** (Play icon)
    now opens `SessionPickerSheet`; small secondary "Catat manual" link below keeps the
    manual WorkoutSheet entry (verified: sheet opens with Angkat Beban/Kardio modes).
  - ProgramCard day buttons ("Mulai sesi Hari A/B/…") now call `startSeededSession`
    instead of `openWorkoutSheet` — starting a program day now truly starts the
    immersive session with the day's exercises + history-based prefills (label/icon
    unchanged).
  - Mounted `<SessionPickerSheet open={sessionPickerOpen} …/>` + `<WorkoutSessionOverlay />`
    at the end of the screen root (fixed overlays read session-store, so an active
    session re-appears when returning to the Bugar tab — verified in browser).
  - NOT touched: workout-sheet.tsx (unchanged), store.ts, sync-engine.ts, rutina-app.tsx,
    globals.css, Asupan/Tubuh panels, history list/PR board/library/hero.

## Every existing Bugar feature accounted for
- Hero week summary (sessions/minutes/tonase, PR strip, kcal estimate) — unchanged.
- Subtabs Latihan/Asupan/Tubuh (Radix RutinaTabs) — unchanged.
- "Catat Sesi" manual flow — preserved via "Catat manual" link → global WorkoutSheet
  (beban blocks + kardio jalan/lari + pace, date/duration/note), also still opened from
  ExerciseCard "Catat gerakan ini".
- Program cards (4 programs, expand, day detail, per-day start) — same UI, day start now
  seeds the immersive session instead of the sheet (quick log still available via
  Catat manual).
- Riwayat list (expand per-set grouping, delete, empty state) — unchanged; sessions
  saved from immersive mode appear here naturally via addWorkout (verified: "Beban ·
  3 set — Rab, 18 Nov / 600 kg tonase · e1RM ≈ 34,8 kg").
- Papan Rekor e1RM (prBoard, gold #1) — unchanged; auto-picks up session sets (verified).
- Pustaka Gerakan (search, muscle filter chips, ExerciseCard expand: desc, steps, tip,
  mistakes, Catat gerakan ini) — unchanged.
- Asupan panel & Tubuh panel — untouched.

## Session flow (verified in browser, 390px)
Bugar → "Mulai Sesi Latihan" → picker (recent chips from history / grouped select /
target sets / "Latihan kosong") → "Mulai Sesi" → fullscreen espresso overlay (no nav):
chips + playfair name + steppers + "Set sebelumnya" → SET SELESAI → set pill + chip
counter + progress bar advance + RestCard 01:30 (verified +15 dtk → 01:42, Lewati,
auto-finish toast) → swipe/arrow/chips/prev-next to move (verified ArrowRight →
Bench Press) → repeat → "Akhiri" → dialog → "Simpan & akhiri" → addWorkout + toast +
anime.js celebration (3 set / 600 kg / 4 mnt / 2 gerakan) → auto-dismiss → Bugar with
new history row + PR board entries.

## Tab switch mid-session
The overlay blocks the bottom nav while active (fixed z-70 covers it), but if the
screen unmounts (tab switch / app-tree Fast Refresh from concurrent agents), the
session lives in the separate session-store: returning to Bugar re-mounts the overlay
with all sets, rest deadline and progress intact (verified — session survived a
Fast-Refresh remount + Keuangan round-trip, rest auto-resolved with toast). Full page
reload intentionally clears an unsaved session (memory-only by design); saved sessions
persist through the app store/sync engine (verified after reload).

## Lint / types / runtime
- `bunx eslint src/components/rutina-mobile/screens/bugar.tsx
  src/components/rutina-mobile/fitness/workout-session.tsx
  src/components/rutina-mobile/fitness/session-store.ts
  src/components/rutina-mobile/fitness/workout-sheet.tsx` → exit 0, 0 problems
  (fixed during dev: react-hooks/refs — dir as state not ref; react-hooks/set-state-in-effect
  ×2 — picker reset via workout-sheet prevOpen render pattern, stepper prefill via
  render-time adjust pattern).
- `bunx tsc --noEmit` → 0 errors in scoped files (fixed TS18047 narrowing via const capture).
- dev.log clean (no compile/runtime errors); manual sheet, picker, session, timer,
  save, celebration, history, PR board all verified live in the browser.
