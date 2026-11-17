# Task 2-a — Landing Style: Claymorphism

## Deliverable
- Created exactly ONE file: `src/components/landing/claymorphism.tsx`
  - Default export: `Claymorphism` (function component, 'use client')
- No other files were modified. No installs. No git.

## Design language implemented
- Warm cream page bg `#FFF3E4`; clay surfaces white `#FFFEFB`, peach `#FFDFC7`,
  mint `#D7F0DF`, butter `#FFEFBF`, rose `#FFDCE5`; coral primary `#FF7A50`.
- Six reusable clay shadow recipes defined as consts (`CLAY_BASE`, `CLAY_PEACH`,
  `CLAY_MINT`, `CLAY_BUTTER`, `CLAY_ROSE`, `CLAY_CORAL`) = soft outer drop +
  inner top light + inner bottom dark. Radii `rounded-[20px]`..`rounded-full`.
- Squish recipe shared const: `whileHover scale 1.04 / whileTap scale 0.94`,
  spring stiffness 320 / damping 16, applied to every clay CTA, nav link,
  mock card, toggle, and footer link.

## The 3 required signature elements (all present)
1. **Floating Island Navbar** — `nav` near top of file (search `Elemen 1`):
   `mx-auto mt-5 w-[calc(100%-2rem)] max-w-3xl rounded-full`, white clay shadow,
   detached from edges, NOT sticky. Section root has `pt-20` so it floats below
   the global fixed style-switcher pill. Logo = coral clay circle + CheckCheck,
   center links (Fitur / Cara kerja / Cerita, hidden below md, smooth-scroll to
   section ids), right coral squishy "Mulai" CTA with toast.info.
2. **Infinite Marquee** — search `Elemen 2`: 2 full-bleed rows on a `-rotate-1`
   wrapper between hero-mockup and features. Track = `flex w-max gap-3 pr-3`
   with `animate-[marquee-left_34s_linear_infinite]` /
   `animate-[marquee-right_46s_linear_infinite]` (keyframes already in
   globals.css), content duplicated EXACTLY 2x for seamless -50% loop, edge fade
   mask, `group-hover:[animation-play-state:paused]`, `motion-reduce:animate-none`,
   second copy aria-hidden. All 10 spec pills (incl. CloudUpload — verified it
   exists in lucide-react 0.525). Row 2 = same items rotated by 5, colors offset.
3. **Mega Footer** — search `Elemen 3`: link row (Tentang/Bantuan/Privasi) +
   tagline "Kebiasaan baik, dibentuk pelan-pelan." + GIANT "rutina" wordmark
   (`text-[24vw] sm:text-[20vw] leading-[0.82] font-black tracking-tighter
   lowercase select-none`, gradient `from-[#FFB98A] to-[#FF7A50]` bg-clip-text,
   clay drop-shadow) inside `overflow-hidden px-4 py-8 sm:py-10` container +
   "© 2025 rutina — dibentuk dengan sabar." Entrance via anime.js when in view
   (useInView once): opacity 0→1, scale 0.92→1, ease 'outBack(1.2)', revert() cleanup.

## Page structure (top → bottom)
pt-20 root → island navbar → hero (mint clay badge, H1, sub, coral "Mulai
gratis" toast + white clay "Lihat demo" → goToStyle(2)) → 3 floating clay
mockup cards (peach/mint/butter, rot -6/2/-3, infinite y float staggered,
whileHover squish, mobile vertical stack / sm+ fanned row, middle card has a
working mini ClayToggle) → marquee → features "Semua terasa membulat" (3 clay
cards, anime.js stagger entrance) → interactive "Coba sentuh" habit list
(max-w-md white clay card, 4 habits, custom ClayToggle motion.button
role=switch, "X dari Y selesai" tabular-nums, all-done →
toast.success('Sempurna! Semua kebiasaan hari ini tuntas.')) → weekly bars
"Konsistensi mingguan" (7 pill bars h 42/68/50/85/58/92/74%, coral/peach
alternating, anime.js scaleY from 0 transformOrigin bottom outBack(1.4),
"Rata-rata <Counter to={67}/>%") → mega footer.

## Quality gates
- `bunx eslint src/components/landing/claymorphism.tsx` — clean.
- `bunx tsc --noEmit` — zero errors in this file (fixed React EffectCallback
  issue by returning `() => { anim.revert() }` with void body). NOTE:
  bento-grid.tsx / typography-driven.tsx still carry the same TS2345 error
  from other agents — left untouched per instructions.
- Dev server log healthy, no compile errors.
- No Math.random (all deterministic), no emoji, no indigo/blue, no bare border,
  Indonesian copy, aria labels on toggles + icon-only elements, semantic
  nav/main/section/footer, focus-visible rings everywhere, mobile-first
  (full-width stacked CTAs, links hidden below md, marquee works at 390px).

## Notes for the wiring agent
- `page.tsx` does NOT import Claymorphism yet — whoever owns the global style
  switcher must add it as index 4 (after Tipografi) per the goToStyle contract.
