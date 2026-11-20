# Task 5-d — Fix Agent: Accessibility & Component Polish (Rutina 2.0)

Agent: Z.ai Code (Fix Agent 5-d)
Task ID: 5-d
Status: COMPLETE — all 10 fixes applied; `bun run lint` clean; `tsc --noEmit` clean for all scope files.

Scope honored: ONLY the 10 allowed files were edited (verified via `git diff --stat` — no other file touched by this agent).

## Fixes applied (all)

1. **splash.tsx — keyboard skip.** Skip surface (`role="button"` overlay) gained `tabIndex={0}` + `onKeyDown`: Enter or Space triggers `finish()`; Space additionally `e.preventDefault()` (prevents page scroll). Indonesian comment explains why. Tap-to-skip/click behavior unchanged.

2. **habit-sheet.tsx — 4 fixes.**
   - Escape handler now guards `document.querySelector('[data-state="open"][role="alertdialog"]')` before closing — Radix AlertDialog intentionally swallows Escape (confirmations must not be dismissed accidentally), so without the guard the sheet closed underneath and orphaned the delete dialog. Comment in Indonesian documents the rationale.
   - Panel className gained `shadow-sheet` (parity with RutinaSheet panels).
   - Trigger-candidate picker: dropped misleading `role="listbox"`/`role="option"` (no arrow-key nav / roving tabindex existed). Container is now `role="group"` with `aria-label="Kandidat kebiasaan pemicu"`; buttons use `aria-pressed` (was `aria-selected`). Visuals & interaction identical.
   - Hit-slop on 3 undersized controls via `relative before:absolute before:-inset-1.5 before:content-['']`: 24px color swatches → ~36px effective; the two 28px group-manage buttons (rename/delete) → ~40px. Visual size unchanged.

3. **reading-sheet.tsx — 3 fixes.** Same AlertDialog-open Escape guard (stacked after the existing journal-canvas guard); panel gained `shadow-sheet`; delete-confirm action `text-white` → `text-destructive-foreground` (dark mode sets destructive to clay; white text failed contrast — fg token pairs correctly in both themes, used 13x elsewhere).

4. **day-detail-sheet.tsx — visible close control.** `DayDetailBody` gained optional `headerAction?: ReactNode` passed into `RutinaSectionHeader`'s built-in `action` slot. `DayDetailSheet` passes a 44px (`h-11 w-11`) icon-only X button, `aria-label="Tutup detail hari"`, `onClick={onClose}` (same handler as backdrop), styled like sibling sheet close buttons (`text-content-secondary`, hover `bg-surface-secondary`/`text-content-primary`, standard focus-visible outline). Desktop `DayDetailPanel` does not pass it (permanent inspector, no close semantics).

5. **compose-sheet.tsx — folder chips focus-visible.** Added `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary` — the exact chip focus pattern used by habit-sheet category/group chips (the `@utility interactive` in globals.css defines the same contract: 2px outline + 2px offset; the chip-local pattern was mirrored to match sibling chips verbatim).

6. **quick-action-hub.tsx — 3 fixes.** Hub backdrop `bg-black/35` → `bg-espresso/45` (standard sheet backdrop token; blur kept). Search input keeps `outline-none` but gains a subtle keyboard focus ring `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary` (inner outline, unobtrusive for a search field). FAB halo: `motion-safe:animate-glow` removed, static halo kept, comment mirrors daily-highlight-card.tsx's removal note.

7. **bottom-nav.tsx — plus-dock halo.** `motion-safe:animate-glow` removed, static halo kept (`bg-primary/40 blur-md` + opacity transition). Header comment rewritten in the daily-highlight-card.tsx:160-170 style ("halo STATIS ... animate-glow dihapus — direktif melarang animasi berulang dekoratif").

8. **rutina-button.tsx — destructive variant.** `text-white` → `text-destructive-foreground` (same dark-mode contrast rationale as fix 3).

9. **fitness/asupan-panel.tsx — 2 fixes.** Delete-confirm action `text-white` → `text-destructive-foreground`; "Tambah Asupan" button `whileTap` scale 0.98 → 0.97 (card-scale band of the press convention).

10. **celebration.tsx — reduced motion + radius.** `useReducedMotion()` from `motion/react`: when true, confetti pieces are not rendered (their end state is off-screen/faded — identical result) and the pill card renders instantly at its final state via `initial={false}` (MotionConfig `reducedMotion="user"` only kills transforms; opacity keyframes still animated, hence the explicit handling). Auto-dismiss timer (2500ms) untouched. Card radius `rounded-sheet` (28px sheet-corner token, wrong for a centered pill) → `rounded-2xl`.

## Not applied / notes

- **Transient lint error observed mid-session** in `src/components/rutina-mobile/screens/profile.tsx` (576:61 "Identifier expected") — a stray `}` in a JSX attribute comment left by a *concurrently running* agent's in-flight edit. NOT in my file scope and not introduced by me; by the next full lint run the concurrent agent had already resolved it (comment removed). Full `bun run lint` now passes with zero errors. No action needed.
- **compose-sheet.tsx panel also lacks `shadow-sheet`** but was not in my fix list — deliberately left untouched (strict scope/fix discipline; flag for a future polish pass alongside any other hand-rolled sheets).

## Deviations

- Fix 4 implementation detail: instead of absolutely positioning a close button over the header, the button goes through `RutinaSectionHeader`'s existing `action` slot (new optional `headerAction` prop on the file-local `DayDetailBody`). This keeps it truly "in the sheet header row", avoids title overlap on narrow screens, and requires no changes outside day-detail-sheet.tsx.
- Fix 5/6b: used the codebase's established focus-visible spelling (`focus-visible:outline focus-visible:outline-2 ...`) rather than the literal suggestion without the bare `focus-visible:outline`, since that's the exact pattern every other chip/input in rutina-mobile uses (and mirrors the `@utility interactive` contract).

## Verification

- `bun run lint` — 0 errors, 0 warnings (full repo).
- `bunx tsc --noEmit` — no diagnostics in any of the 10 scope files.
- `dev.log` — clean compiles after edits (no errors/warnings).
