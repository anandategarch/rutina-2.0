# Task 2-b — Home as Daily Command Center (Rutina 2.0)

Agent: home-command-center (screens/home.tsx restructure)
Date: 2026-11-18
Scope: `src/components/rutina-mobile/screens/home.tsx` (full rewrite) + NEW `src/components/rutina-mobile/home-progress-ring.tsx`. No other files touched (store.ts, task-row.tsx, sync-engine.ts, globals.css, other screens untouched).

## New structure (top -> bottom)

1. `DemoBanner` — unchanged (demoMode only), now the very first element.
2. Header block — small-caps date badge ("SELASA, 18 NOV" via Intl id-ID weekday-long + day + month-short, uppercased) + avatar -> profil; Playfair greeting by hour (<11 pagi / <14 siang / <18 sore / >=18 malam, with period); subtitle "Mari mulai dengan satu langkah kecil."; scroll-driven shrink: useScroll on the screen scroll container, headerScale 1->0.96 and subtitleOpacity 1->0 over 120px (transform/opacity only, origin-top).
3. Hero progress card — RutinaCard (default/spacious/2xl + shadow-soft), inner capped sm:max-w-[600px]: HomeProgressRing (new SVG ring, 110px, matcha var(--primary) arc, var(--border) track, spring dashoffset, Counter % in center) + "PROGRES HARI INI" label, "X dari Y misi", "N misi tersisa" / "Semua misi selesai — hari yang sempurna." (text-success) / "Belum ada misi terjadwal." (0 scheduled), chips: Flame "Streak N hari" (bg-gold/25 text-espresso), Zap "Level N" (bg-secondary text-matcha-deep); XP mini-bar toward XP_TARGET (bg-secondary fill on bg-surface-sunken track, Counter xp, "N XP lagi"/"MAX", role=progressbar).
4. DateStrip (sticky, unchanged logic; added mt-5) — placed right after hero ("near hero"), drives selectedDate for the agenda below.
5. "Agenda hari ini" (RutinaSectionHeader; title "Agenda" when viewing another date):
   - Context ribbon for past/future dates (unchanged copy, "Hari ini" reset button).
   - Incomplete habits grouped by reminder: Pagi (<12:00, Sunrise), Siang (12:00-16:59, Sun), Malam (>=17:00, Sunset), Kapan saja (null/empty, Clock, always last). Group header = icon + label + count badge; rows = TaskRow (same props as before), grid-cols-1 sm:grid-cols-2; group-level stagger entrance.
   - Empty state (no scheduled habits): RutinaEmptyState "Tidak ada misi terjadwal hari ini" + "Tambah kebiasaan" button (openHabitCreate).
   - "Selesai (N)" collapsible: AnimatePresence height:auto, chevron rotation, aria-expanded/aria-controls; auto-opens when a pending-group TaskRow is toggled complete (event-driven setShowDone(true) — no effect needed). Rows = TaskRow (done styling handled by TaskRow itself).
   - Subtle "+ Tambah kebiasaan" dashed row at the end of agenda (openHabitCreate).
   - Archive collapsible (unchanged): restore via setHabitArchived(id,false) + toast, edit via openHabitEdit.
6. Bonus konsistensi slim card (unchanged markup incl. anime.js gift burst giftRef + toast) — now under the agenda.
7. "Insight pekan": FocusWidget + StreakWidget in grid grid-cols-1 sm:grid-cols-2 gap-4 (stacks on mobile, side-by-side >=sm).
8. PunchCard (kept as-is, wrapped with mt-5).
9. "Koleksi" folder section: RutinaSectionHeader + NEW "Catatan" pill action (openCompose() — preserves the old hero's "Catatan Baru" quick-compose entry point); folder cards unchanged (openFolder, per-folder openCompose(key), folderCount) — now iterates store FOLDERS for labels.
10. Quote card (unchanged editorial design: Quote icon, playfair italic QUOTE_TEXT, QUOTE_AUTHOR, saveQuote button with quoteSaved state).

## Preserved features (all previous functionality retained)

- Demo banner actions (startFresh/keepSample + toasts) — verbatim.
- Avatar -> setScreen('profil').
- DateStrip browsing + selectedDate coupling: agenda follows selectedDate; past dates checkable, future readOnly (TaskRow readOnly prop); "Hari ini" ribbon reset.
- XP economy: computeXp/computeLevel, XP_PER_TASK on every TaskRow, XP bar to XP_TARGET; level-8 celebration still handled by rutina-app.tsx (untouched).
- Bonus claim flow: claimBonus + toast + anime.js gift animation (refs kept).
- Celebration + toast when ALL today's missions done (firedRef guard, setCelebrating).
- openHabitCreate / openHabitEdit (HabitSheet) flows; archive/restore flow.
- Quote save flow (saveQuote + toast + disabled state).
- FocusWidget, StreakWidget, PunchCard, folder/journal quick actions.
- Entrance animations (stagger fade-up, whileInView below fold) kept subtle.

## Consciously changed / removed (with reason)

- Old header wordmark "rutina." + "LV" badge: removed from home header per new direction (brand wordmark still present in splash + desktop-stage chrome; level info folded into hero "Level N" chip).
- Old matcha-primary hero card (HeroDoodle + big % + GoalRing(dailyGoal) + XP strip + "Catatan Baru" CTA): replaced by the new light hero progress card per direction. Consequences:
  - GoalRing (dailyGoal-based ring) replaced by HomeProgressRing (today's scheduled-missions %). dailyGoal is still surfaced via DateStrip captions ("X/goal misi target tercapai") and PunchCard stamps — no data/feature lost.
  - HeroDoodle dropped: its strokes use text-primary-foreground/40 (designed for the old dark hero; invisible on the new parchment card). Decorative only.
  - "Catatan Baru" CTA moved to Koleksi section header ("Catatan" pill, same openCompose()).
  - Old hero parallax (heroY/heroOpacity) replaced by the new header scroll-shrink per direction.
- Old "Misi Hari Ini" SectionTitle + header "+" button: replaced by RutinaSectionHeader "Agenda hari ini" + end-of-agenda "+ Tambah kebiasaan" row + empty-state button (same openHabitCreate flow; spec asked for the end-of-agenda entry).
- SectionTitle helper component removed (superseded by shared RutinaSectionHeader).
- Greeting no longer includes ", Ananda." (direction specifies plain "Selamat pagi." etc.); name still visible in Profil/Statistik.
- TaskRow rows no longer individually stagger-wrapped inside groups (group-level stagger instead) — keeps entrance subtle, TaskRow's own layout/check animations untouched.

## Files

- Modified: `src/components/rutina-mobile/screens/home.tsx` (1068 lines)
- Created: `src/components/rutina-mobile/home-progress-ring.tsx` (HomeProgressRing, the one allowed new file)

## Lint

`bunx eslint src/components/rutina-mobile/screens/home.tsx src/components/rutina-mobile/home-progress-ring.tsx` -> PASS (0 errors, 0 warnings). One iteration was needed: react-hooks/set-state-in-effect flagged an auto-open effect; replaced with event-driven setShowDone(true) inside the pending rows' onToggle. Dev server recompiled clean, GET / -> 200.

## Store helpers used (confirmed signatures)

- `todayISO(): string`
- `fromISO(iso: string): Date`, `addDaysISO(iso: string, n: number): string`
- `longDateLabel(iso): string`, `shortDateLabel(iso): string` (date badge built separately with Intl weekday-long/day/month-short + toUpperCase)
- `habitsOn(habits: Habit[], dateISO: string): Habit[]`
- `isDoneOn(c: Completions, dateISO: string, habitId: string): boolean`
- `doneCountOn(c: Completions, dateISO: string): number`
- `habitStreak(h: Habit, c: Completions, today: string): number`
- `bestStreak(habits: Habit[], c: Completions, today: string): { habit: Habit | null; streak: number; record: number }` (uses .streak for hero chip)
- `computeXp(doneCount: number, bonusClaimed: boolean): number`
- `computeLevel(xp: number): number`
- `folderCount(notes: Note[], key: FolderKey): number`
- Constants: `XP_PER_TASK`, `XP_BONUS`, `XP_TARGET`, `WEEKDAY_MIN`, `QUOTE_TEXT`, `QUOTE_AUTHOR`, `FOLDERS`
- Types: `Habit` (reminder: string | null "HH:MM"), `Completions`, `FolderKey`
- Store hooks used: habits, completions, selectedDate, setSelectedDate, toggleHabit, openFolder, openCompose, quoteSaved, saveQuote, notes, expandedTaskId, toggleExpandedTask, openHabitCreate, openHabitEdit, setHabitArchived, setCelebrating, bonusClaimed, claimBonus, setScreen, demoMode/startFresh/keepSample (inside DemoBanner), dailyGoal (inside DateStrip).

## Notes for other agents

- /agent-ctx did not exist before this task (no prior records found; created it with this file).
- DateStrip now lives in home.tsx directly under the hero and is the only selectedDate driver on Home; if you build a stats/calendar screen, reuse store.selectedDate semantics (past checkable, future readOnly).
- Home hero percentage = doneCountOn(today) / habitsOn(today).length, clamped 0-100.
- Agenda grouping helper `slotOf(habit)` is local to home.tsx (Pagi <12:00, Siang <17:00, Malam >=17:00, else Kapan saja last).
