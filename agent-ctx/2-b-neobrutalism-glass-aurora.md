# Task 2-b — Landing Styles: Neobrutalism & Glass/Aurora

## Deliverables
- Created exactly TWO files, nothing else touched. No installs. No git.
  - `src/components/landing/neobrutalism.tsx` — default export `Neobrutalism` ('use client')
  - `src/components/landing/glass-aurora.tsx` — default export `GlassAurora` ('use client')
- `bun run lint` passes clean; dev.log shows clean compiles, no runtime errors.
- NOTE for coordinator: `src/app/page.tsx` STYLES array currently only registers
  4 styles. Per the task spec, my components map to switcher indices
  **5 = Neobrutalism** and **6 = Glass & Aurora** (goToStyle(5) / goToStyle(6)).
  Registering them in page.tsx is outside my file scope.

## File 1: neobrutalism.tsx
Palette: `bg-amber-100` page; cards `bg-white border-[2.5px] border-stone-950
shadow-[6px_6px_0_0_#1c1917]` (5px on mid cards, 4px small); accents yellow
`#FDE047`, rose `#FDA4AF`, lime `#BEF264`, orange `#FB923C`. Root:
`w-full overflow-hidden bg-amber-100 pb-0 pt-20` (pt-20 clears the fixed
global switcher + its keyboard hint).

Structure + interactions:
1. **Nav** — white bar `border-b-[2.5px]`, black square logo w/ white CheckCheck,
   links FITUR/CARA KERJA/CERITA (decoration-[2.5px] underline offset-4),
   yellow CTA h-10 with 4px press effect (`active:translate-x/y-[4px]
   active:shadow-none`) → `toast.info('Ini contoh gaya Neobrutalism', …)`.
2. **Hero** — md:grid-cols-2. Left: rose sticker badge "-rotate-2" GRATIS 30
   HARI; H1 `text-5xl sm:text-7xl font-black leading-[0.95]` "BANGUN
   KEBIASAAN. TANPA BASA-BASI." (last phrase on lime `box-decoration-clone`
   highlight); yellow "MULAI SEKARANG" + white "LIHAT DEMO" (→ goToStyle(2)),
   both 5px-shadow press effects + hover lift. Right: **draggable sticker
   card** — motion.div `drag dragConstraints={heroRightRef} dragElastic={0.2}
   whileDrag={{scale:1.05, rotate:2}} whileHover={{scale:1.02}}` +
   `rotate-3 cursor-grab touch-none active:cursor-grabbing`; contains Flame in
   orange-300 brutal square + "27 HARI STREAK!" + MoveHorizontal "GESER AKU"
   hint. 3 inline-SVG doodles (star/zigzag/asterisk, accent colors, black
   strokes) absolutely positioned, `pointer-events-none aria-hidden`, each in a
   `Bobber` (spring pop-in + infinite y/rotate float).
3. **Ticker strip** — `-ml-[1%] w-[102%] -rotate-1 border-y-[2.5px] bg-white`,
   one `whitespace-nowrap` line, TICKER_TEXT repeated exactly 6x
   (deterministic), motion opacity entrance.
4. **"CEKLIS HARI INI"** — thick `h-5 border-[2.5px] rounded-full` progress bar
   with animated motion width (turns lime at 5/5) + "X/5 SELESAI" tabular-nums;
   grid sm:2/lg:3 of brutal cards; each has a `role="checkbox"` size-9 button
   (`aria-checked`/`aria-label`) → checked `bg-lime-300` + Check icon spring
   pop via AnimatePresence (scale+rotate in/out); habit name uppercase, mini
   rotated tag sticker. 5 habits with per-tag accent bg. All-5 transition →
   `toast.success('CEKLIS PENUH! Hari yang brutal-productive.')`.
   Entrance: anime.js `animate(children, {opacity:[0,1], y:[26,0],
   stagger(70), ease:'outExpo'})` when `useInView(once)` + `.revert()` cleanup;
   cards baked `opacity-0` (same pattern as bento-grid dots).
5. **Stats row** — grid-cols-3 brutal cards in yellow/rose/lime, alternating
   ±1deg tilt + `hover:rotate-0`, giant `<Counter to={27|82|1248} />` (+% suffix).
6. **CTA ticket** — white brutal card, left "KLAIM MODE PERCOBAANMU" + black
   button `shadow-[5px_5px_0_0_rgba(0,0,0,0.25)]` "AMBIL TIKETMU" →
   `toast.success('Tiket percobaan 30 hari diklaim! (demo)')`; right half dashed
   divider + "30 HARI / PERCOBAAN PENUH"; perforation half-circles
   `size-6 rounded-full bg-amber-100 border-[2.5px]` — responsive pair: left/right
   of the horizontal divider on mobile (`sm:hidden`), top/bottom centered on the
   vertical divider on sm+ (`hidden sm:block`, `-top-3.5/-bottom-3.5` at
   `left-0 -translate-x-1/2`).
7. **Footer** — `bg-stone-950`, RUTINA + Tentang/Bantuan/Privasi + copyright.

## File 2: glass-aurora.tsx
Root exactly per spec: `relative flex min-h-screen w-full flex-col
overflow-hidden bg-stone-950 pb-0 pt-16 text-stone-100`; content wrapper
`relative z-10 flex flex-1 flex-col` so footer `mt-auto` sticks correctly.

1. **Aurora bg** — 3 absolute motion blobs (emerald `size-[34rem] blur-[110px]`
   top-left / rose `size-[30rem]` bottom-right / amber `size-[36rem]
   blur-[120px]` center-right), each drifting `x/y/scale` keyframes,
   `repeat: Infinity`, durations 18/24/30s, `aria-hidden pointer-events-none`.
2. **Nav** — floating glass pill `rounded-full border-white/15 bg-white/10
   backdrop-blur-xl mt-4` (clears the global switcher); gradient logo circle +
   Flame; links Fitur/Statistik/Cerita (hidden md:flex); white CTA →
   `toast.info('Ini contoh gaya Glass & Aurora', …)`.
3. **Hero** — glass badge "v2.0 — kini dengan aurora" (Sparkles), H1 with
   emerald→amber gradient phrase, white "Mulai gratis" + glass ghost "Lihat
   demo" (→ goToStyle(2)); motion stagger delays .08/.16/.26/.34.
4. **Dashboard panel** — spring scale-in (opacity 0, y 30, scale 0.97).
   Header "Selamat pagi, Arun" + shadcn Tabs 7/30/90 Hari (dark-glass trigger
   overrides). KPI grid-cols-3 with `<Counter>` re-animating per tab
   (27/21/86, 27/89/82, 27/261/79). Bar chart `h-36` — 7/10/12 bars with
   deterministic heights + `title` tooltips ("Sen — 2/4 kebiasaan" etc.);
   bars baked inline `transform: scaleY(0.2)` + `transformOrigin: bottom`
   (keys include range → clean remount, no flash), animated by anime.js
   `scaleY: [0.2, 1], stagger(30), ease: 'outExpo'` in a `useEffect` keyed on
   `range` with `.revert()` cleanup (runs on mount + every tab change).
   Progress strip "Target hari ini X/3" + `h-1.5` gradient fill (motion width).
5. **Habit rows** — 3 glass rows, custom `role="checkbox"` size-7 glassy
   buttons → checked `bg-emerald-400 border-emerald-300` + Check spring pop
   (AnimatePresence); `whileHover={{y:-2}}` + CSS `hover:border-white/25`.
   State lifted to root: toggling updates the panel's X/3 + progress; 3/3
   transition → `toast.success('Semua target hari ini tercapai. Keren!')`.
6. **Features** — Bell/Flame/BarChart3 glass cards, icon chips
   `bg-white/10 border-white/15 rounded-xl p-2.5`, `whileHover y -4` on inner
   motion.div (outer div is the anime target → no transform conflict);
   entrance anime.js stagger(90) when in view + revert.
7. **Stats band** — glass strip, divide-x, Counter 27 / 82% / 1248.
8. **CTA + footer** — glass card "Siap berkilau tiap hari?" + white button →
   toast; footer `mt-auto border-t border-white/10` centered copyright.

## Shared engineering notes
- animejs v4 writes `style.transform` (verified in node_modules dist), so it
  composes safely with Tailwind v4 individual-property utilities (`rotate-3`,
  `translate`) and never conflicts with Motion transforms on separate nodes.
- Every anime.js animation is stored and `.revert()`ed in cleanup.
- No Math.random (bar tooltips derived from height math); no emoji; no
  indigo/blue; every border has an explicit color; all icon-only/checkbox
  controls are `<button>` with role/aria-label/aria-checked.
- Deviations from spec (minor):
  - Fixed the spec typo "sepanang hari" → "sepanjang hari" (glass habit time).
  - Hero primary CTA also fires the same toast.info as nav CTA (spec only
    required the toast on nav; matches sibling styles' convention).
  - Bar hover uses `transition-[filter]` instead of bare `transition` to avoid
    CSS-transitioning anime's per-frame transform writes.
  - Neobrutalism root uses pt-20 (spec allowed pt-16 or pt-20) so the brutal
    nav clears the global switcher's keyboard-hint text.
