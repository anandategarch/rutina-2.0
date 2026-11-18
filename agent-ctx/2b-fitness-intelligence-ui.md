# Task 2b — Fitness Intelligence UI (Rutina 2.0, layar Bugar)

Agent: Z.ai Code (subagent — fitness intelligence UI)
Date: 2026-11-18
Status: COMPLETE — scoped ESLint exit 0 (0 problems, full `bun run lint` also clean),
`tsc --noEmit` 0 errors in scoped files (2 pre-existing errors exist in OTHER
agents' files: `day-detail-sheet.tsx` TS2339 `mound`, `store.ts` TS2352 migrate
cast — NOT touched by me, owned by others). dev.log clean, GET / 200.

NOTE for concurrent agents: dev.log was rotated (fresh server start) during this
task; my final curl-triggered compile of `/` is clean (200, no compile errors).

## Files

### Modified
- `src/components/rutina-mobile/checkin-sheet.tsx`
  4-component check-in: new local `Scale1to5` component (single visual source,
  classes identical to the old inline Energi selector) used for **Energi**,
  **Nyeri otot (DOMS)** ("1 = tidak nyeri · 5 = sangat nyeri"), and **Stres**
  ("1 = tenang · 5 = sangat stres"). Prefill from `bodyLogs[today]`
  (soreness/stress) via the existing render-time open-reset pattern; submit
  passes `soreness`/`stress` to `logBodyCheckIn` (all fields still optional —
  null → undefined). Sheet description now lists all five inputs. Sleep
  stepper + MOODS pills untouched.
- `src/components/rutina-mobile/fitness/tubuh-panel.tsx`
  Readiness section: colored hero card kept as-is; null-branch text updated to
  four-component wording + "Isi check-in pagi" button (opens global CheckInSheet
  via `useCheckInSheet`). NEW "Rincian Kesiapan" card below: per-component rows
  (label + `{weight}%` + thin bar; `bg-gradient-to-r from-primary to-pistachio`
  matcha gradient, `bg-clay` amber when score < 50). If `readiness.missing`
  non-empty → tappable hint "Lengkapi check-in: {missing.join(', ')} agar Coach
  lebih akurat." → `openCheckIn()`.
- `src/components/rutina-mobile/screens/bugar.tsx`
  NEW "Coach Bugar" section (RutinaSectionHeader, after "Catat manual", before
  Program Latihan) with:
  a. **Kesiapan latihan** compact card: big score number + label + hint; null →
     invite card with button opening CheckInSheet.
  b. **Deload banner**: `deloadActive(deloadUntil, todayISO())` → amber card
     (`border-warning/40 bg-gold/25`) "Masa deload aktif hingga
     {longDateLabel}" + subtitle + "Akhiri deload sekarang" → `endDeload()` +
     toast. Else `detectPlateau` over every unique 'beban' exercise name
     (returns null <3 sessions); any stalled → warning card "Plateau
     terdeteksi" with name chips + "e1RM tidak membaik dalam 3 sesi terakhir" +
     "Mulai deload 7 hari" → `startDeload(7)` + toast "Deload 7 hari dimulai —
     target beban dipangkas 50%."
  c. **Guard latihan silang**: `cardioGuard(workouts).tooMuch` → gentle
     sand/amber card (Footprints, "{n} sesi kardio 7 hari terakhir") with the
     suggestion text.
  d. **Alat Barbel entry** row (Calculator icon, subtitle "Kalkulator piring,
     1RM, dan pemanasan") → opens BarbellToolsSheet.
  New hooks: `deloadUntil/startDeload/endDeload`, `useCheckInSheet`; mounted
  `<BarbellToolsSheet>` beside SessionPickerSheet. All existing sections
  (hero, CTA, programs, riwayat, PR board, pustaka, tabs, panels) untouched.
- `src/components/rutina-mobile/fitness/workout-sheet.tsx`
  Deload-aware targets (mode 'beban' + `deloadActive`): amber notice chip
  "Masa deload — target beban disarankan 50%" + "Terapkan 50%" button.
  `applyDeload()` expands valid blocks into `WorkoutSet[]` (same path as
  submit), runs `deloadSets()` (50% + round2_5), maps results back per block
  into the draft string inputs (`fmtInput`: 27.5 → "27,5"). Invalid blocks
  left untouched; manual editing still possible after applying.
- `src/components/rutina-mobile/fitness/workout-session.tsx`
  a. **Rest timer sound**: module-local sound module — `let audioCtx` +
     `let soundOn = true` (module-level, NOT store, default ON, survives
     remounts). `ensureAudio()` builds/resumes AudioContext and is called from
     user gestures only: `handleComplete` (SET SELESAI), "+15 dtk" extend, and
     the unmute toggle. `playBeep(freq=880, duration=0.08, delay)` is a sine
     osc + gain envelope; one beep when the tick-derived whole second becomes
     3 / 2 / 1 (effect keyed on `[secondsLeft, remaining]` — fires once per
     second boundary, no ref needed); at 0: `finishChime()` (660 Hz 0.16 s +
     880 Hz 0.32 s delayed 0.16 s) + `speakNextSet()` —
     `speechSynthesis` utterance "Ayo, set berikutnya!", id voice + lang
     'id-ID' when an id-* voice exists, else default voice (lang not forced so
     it never goes silent). EVERYTHING wrapped in try/catch — sound can never
     crash the session. Mute toggle (Volume2/VolumeX) top-right of the RestCard
     header, aria-pressed, mirrored local state.
  b. **Saran progresi**: `advice = useMemo(doubleProgression(ex.sets,
     targetReps))` for the active exercise; targetReps = reps of the FIRST
     logged set this session (fallback `hintReps` history, then 8). Chip
     appears after the set pills: ArrowUpCircle pistachio / ArrowDownCircle
     gold / Circle muted + "Saran Coach" eyebrow + "{nextWeight} kg — {reason}"
     + "Terapkan" button → sets the local `weight` stepper (the next set's
     planned weight — see Deviations) + toast. Manual editing unaffected.
  c. **Deload banner**: one informational amber banner (`hero-accent` tone) at
     top of the session main area when `deloadActive(deloadUntil)` — no
     auto-mutation of user data.
- `src/components/rutina-mobile/fitness/asupan-panel.tsx`
  Neraca kalori v2: `burned = burnedToday(workouts, bodyLogs, today)`; balance
  is now `Sisa = Target + Terbakar − Masuk`. Headline denominator + progress
  bar use allowance (target + burned). NEW "Energi terbakar" row (Flame, gold
  on espresso/35 chip) `+{n} kkal`; when 0 → muted hint "Catat latihan di
  Bugar untuk menambah jatah." Adaptive coaching replaces the old remaining
  text: < −300 amber chip (AlertTriangle, gold) "Defisit terlalu dalam —
  jatah energi sudah terlampaui {n} kkal…"; −300..0 neutral; 0..400 positive
  (Sparkles pistachio) "Sisa {n} kkal — tempo yang pas…"; > 400 "Masih ada
  {n} kkal jatah…". Macros grid + target editor + jurnal + 7-day chart intact.

### Created
- `src/components/rutina-mobile/fitness/barbell-tools.tsx`
  `BarbellToolsSheet({ open, onClose })` — fixed-position bottom sheet
  (SessionPickerSheet frame: drag-to-close handle, useFocusTrap, Escape).
  3-tab mini nav (layoutId pill "bb-tab-pill"). Tab state resets to 'piring'
  on each open (render-time prevOpen pattern).
  - **Piring**: total-kg input + bar chips (20 Olimpiade / 15 Wanita IWF /
    10 Mini) → `plateLoader()`; bar visual = horizontal rounded bar with
    center grip + plate circles left/right (real-barbell mirroring: largest
    plate adjacent to the bar on both sides), size 24–54 px scaled by kg,
    kg label inside with luminance-picked text color, "×{count}" per-side
    badge shown once. "Tercapai {achieved} kg" + amber-danger "Sisa
    {remainder} kg tidak terwakili piring" when remainder > 0; friendly
    invalid/empty hints.
  - **1RM**: beban + repetisi inputs → big e1RM (round2_5(e1rmOf)) +
    `rmTable` 95–65% as 2-col grid rows "95% — 142,5 kg".
  - **Pemanasan**: beban kerja input → `warmupLadder` vertical steps, tappable
    to toggle a "selesai" check state (resets when input changes); hint
    "Naikkan bertahap, jangan lompat".
  All live via useMemo; Indonesian formatting via toLocaleString('id-ID').

## Sound autoplay handling
AudioContext is created lazily ONLY inside user-gesture handlers
(`ensureAudio()` called from SET SELESAI, +15 dtk, unmute toggle) so the
context is running before any timer-driven beep; if it doesn't exist yet,
`playBeep` is a no-op. Every audio/speech call is try/catch-guarded.

## Progression suggestions
Appear for the ACTIVE exercise once ≥1 set is logged this session (chip under
the set pills). "Terapkan" writes to the SessionView weight stepper — the
planned weight of the next set — because session-store.ts (not editable by me)
holds no planned-weight field.

## Deviations (with reasons)
1. **Plate tab keeps IWF plate colors (incl. the 20 kg blue #1D4E9B)** — they
   come from `IWF_PLATES` in the frozen fit-utils (real-world barbell color
   standard, domain data, not UI chrome). Noted because of the no-blue UI rule.
2. **Saran Coach targetReps fallback** — SessionExercise has no program
   targetReps (dropped by session-store), so fallback chain is first logged
   set → `hintReps` (last history reps, which the program seed influenced) → 8.
3. **"Terapkan" (session) sets the local stepper**, not a store field — no
   planned-weight field exists in session-store; spec allowed read-only OR
   apply without architecture changes; the stepper IS the next-set target, so
   apply was safe and reversible.
4. **tubuh-panel breakdown is a separate light card below the colored
   readiness hero** (spec: "readiness card shows… PLUS breakdown") — a light
   card is the only surface where the required matcha-gradient vs amber bars
   are actually visible (they vanish on the colored/hero backgrounds).
5. **asupan headline now shows `/ target + burned`** — keeps headline, bar,
   and remaining message on one consistent allowance number.
6. **Warmup "selesai" is an interactive tap-to-check state** (spec's "small
   'selesai' check styling hint"); resets when the work weight changes.

## Lint / types
- `bunx eslint <7 scoped files>` → exit 0, 0 problems.
- `bun run lint` (whole project) → clean, no output.
- `bunx tsc --noEmit` → 0 errors in my files; only pre-existing errors in
  others' files (day-detail-sheet.tsx, store.ts) — left for their owners.
- dev.log: clean compile, GET / 200 (curl-triggered final check).
