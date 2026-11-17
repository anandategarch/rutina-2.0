# Task 3-a — Landing Recolor: Earthy Brand Palette (split-screen + bento-grid)

## Scope
- Recolored EXACTLY two files, colors only (Tailwind utilities, hex, rgba, gradient stops,
  SVG stroke attrs). Structure, copy, animations, logic, imports untouched. No git, no installs.
  - `src/components/landing/split-screen.tsx`
  - `src/components/landing/bento-grid.tsx`

## Palette applied (exact tokens, everywhere)
MATCHA #749B58 (10% accent: CTAs, checked states, key highlights, gradients)
MATCHA_DK #5E7F47 (hover + small accent text on light bg)
MATCHA_LT #A3C48E (accents/gradients on dark bg)
PISTACHIO #E4EFE0 (info box bg, icon chips) · SOFT_MATCHA #DCE9D4 (badge fills)
SAND #F5F3EE (page bg) · SAND_DK #E9E5DC (borders/tracks)
BUTTER #EFE9DA (habit rows /70, stats tiles /70) · TAUPE #E8E0D5 (avatar chip)
ESPRESSO #4A3B32 (icons, borders, warm accents) · DEEP #231F1E (text, dark panels)
MUTED #8A7D72 (body text on light) · MUTED_LT #A99C90 (muted text on dark)
Extra literal from spec: #2B2523 (dark badge bg), #C9BFB2 (badge text on dark),
#D6CFC2 (undone checkbox / drag pill borders).

## split-screen.tsx — groups converted
1. Dark panel: bg-zinc-950→#231F1E, text-zinc-100→#F5F3EE, zinc-400/500→#A99C90,
   blurb blobs orange-500/15→#749B58]/15 & amber-400/10→#E4EFE0]/10.
2. Logo: gradient from-[#749B58] to-[#A3C48E], shadow-[#749B58]/25, CheckCheck icon
   → text-white (matches primary-button treatment on same matcha gradient).
3. v2.0 Badge → border/bgs #4A3B32 + bg #2B2523 + text #C9BFB2; focus-mode pill →
   border #4A3B32, bg #4A3B32]/40, text #A99C90; pulse dot emerald-400→#A3C48E.
4. Hero gradient word → from-[#A3C48E] to-[#749B58] (light→dark per spec).
5. Primary Button → bg #749B58, text-white, shadow #749B58]/25, hover #5E7F47.
   Outline Button → text #F5F3EE, border #4A3B32, hover bg #4A3B32]/50 + text-white.
6. Social proof: AVATAR_BG → [#E4EFE0,#EFE9DA,#DCE9D4,#E8E0D5]; avatar ring
   border-[#231F1E] + text-[#4A3B32]; stars amber-400→#A3C48E; caption→#A99C90.
7. Light panel: bg-stone-100→#F5F3EE; radial dots #d6d3d1→#E9E5DC; blob
   orange-200/60→#E4EFE0]/70.
8. Phone mockup: frame border + notch →#231F1E; inner bg→#F5F3EE; shadows →
   #4A3B32]/20; flame chip bg #E4EFE0 + icon #4A3B32; "2 dari 3" label #5E7F47;
   track #E9E5DC + fill gradient #749B58→#A3C48E; done checkbox bg #749B58
   text-white, undone border #D6CFC2; done text #8A7D72 line-through / pending
   #231F1E; streak card bg #231F1E, flame #A3C48E, sublabels #A99C90.
9. Floating cards: borders #E9E5DC, chips #E4EFE0 + icons #4A3B32, pulse dot #749B58,
   focus fill #749B58, tracks #E9E5DC, shadows #4A3B32]/10, TrendingUp #5E7F47,
   titles #231F1E, sublabels #8A7D72. bg-white/95 + backdrop-blur kept.
10. Drag pill: border #D6CFC2, text #4A3B32, bg-white/90 kept.

## bento-grid.tsx — groups converted
1. Section bg-stone-100→#F5F3EE; Card border-zinc-200/90→#E9E5DC, bg-white kept,
   hover shadow orange-100/60→#E4EFE0 (neutral black rgba base shadow kept).
2. Header Badge → border-[#749B58]/30 + bg #E4EFE0 + text #5E7F47; heading span
   "semua" → #749B58; body text zinc-500→#8A7D72, headings zinc-900→#231F1E.
3. DOT_COLORS → [#E9E5DC, #DCE9D4, #A3C48E, #749B58] (neutral→matcha ramp).
4. Streak card: chip #E4EFE0 + Flame #4A3B32; "+6 minggu ini" Badge →
   bg #DCE9D4 + text #5E7F47 (hover kept same).
5. Ring: stroke #f97316→#749B58, track #e7e5e4→#E9E5DC.
6. Bell chip amber-100→#E4EFE0 + icon #4A3B32; reminder copy text #8A7D72.
7. Habit list: counter text #5E7F47; rows border #E9E5DC + bg #EFE9DA]/60; done
   text #8A7D72 line-through, pending #231F1E; tag Badge bg-white + text #8A7D72.
8. Stats tiles bg-stone-50→#EFE9DA]/70, numbers #231F1E, captions #8A7D72.
9. Testimonial: Quote #A3C48E, body #4A3B32, avatar gradient from-[#A3C48E]
   to-[#749B58] (text-white kept), stars #A3C48E, meta #8A7D72.
10. CTA Button bg-zinc-900→#749B58, hover→#5E7F47, text-white kept; footer note
    + tiny uppercase captions stone-400→#A99C90 (per spec catch-all).

## 60-30-10 discipline
- 60% neutral: SAND #F5F3EE page bg + WHITE cards/surfaces.
- 30% secondary: ESPRESSO icons/borders/text + PISTACHIO chip fills.
- 10% accent: MATCHA only on primary CTAs, done/checked states, progress fills,
  ring stroke, key highlight word. Icons are espresso, not green.

## Verification
- `rg -n "orange|amber|rose|emerald|zinc|stone|lime|yellow"` on both files
  (case-insensitive) → ZERO matches.
- `bunx eslint src/components/landing/split-screen.tsx
  src/components/landing/bento-grid.tsx` → clean (exit 0).
- dev.log: all recent entries "✓ Compiled" / GET 200, no errors.
- No blue/indigo introduced; white utilities (bg-white, bg-white/95, bg-white/90,
  text-white) preserved where they existed.

## Notes for next agents
- shadcn Checkbox/Switch/Button internals were NOT touched (not in scope) — they
  still use theme tokens from globals.css / components.json.
- If the global brand palette gets wired into CSS variables later, the literal hex
  classes in these two files can be swapped 1:1 for semantic tokens.
