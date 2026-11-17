# Task 3-b — Landing Recolor: Earthy Brand Palette (claymorphism + neobrutalism)

## Scope
- Recolored EXACTLY two files, colors only (Tailwind utilities, hex values, rgba shadow
  tints, gradient stops, SVG fill/stroke attrs). Structure, copy, animations, logic,
  imports, press/squish/drag params untouched. No git, no installs.
  - `src/components/landing/claymorphism.tsx`
  - `src/components/landing/neobrutalism.tsx`

## Palette applied (exact tokens, same hex everywhere)
MATCHA #749B58 (10% accent: CTAs, toggle on, checked states, bars, gradients)
MATCHA_DK #5E7F47 (icon accents on light, hover on matcha buttons)
MATCHA_LT #A3C48E (wordmark gradient start, neo H1 highlight, star doodle, complete bar)
PISTACHIO #E4EFE0 (peach-surface replacement, neo stickers/nav CTA/stats)
SOFT_MATCHA #DCE9D4 (mint-surface replacement, badge fills, done pills)
SAND #F5F3EE (page bg) · SAND_DK #E9E5DC (toggle-off track, unchecked row /70)
BUTTER #EFE9DA (butter-surface replacement) · TAUPE #E8E0D5 (rose-surface replacement)
ESPRESSO #4A3B32 (clay shadow tint, icons, neo borders/shadows, flame icon)
DEEP #231F1E (strong text, neo logo box / ticket button / footer)
MUTED #8A7D72 (body) · MUTED_LT #A99C90 (faint) + on-pastel #6B5B50 (rose pill text)
Spec-literal extras: #8FB47A (hero gradient start), white #FFFFFF surfaces.

## claymorphism.tsx — groups converted
1. Clay shadow recipes (3-layer inset structure kept, rgb swapped only):
   CLAY_BASE rgba(214,138,94,.22/.10)→rgba(74,59,50,.18/.09); CLAY_PEACH → rgba(74,59,50,.22/.16);
   CLAY_MINT rgba(96,160,120,…)→rgba(116,155,88,…); CLAY_BUTTER rgba(214,178,84,…)→rgba(139,128,110,…);
   CLAY_ROSE rgba(214,110,140,…)→rgba(120,105,92,…); CLAY_CORAL rgba(214,110,60,…)→rgba(94,127,71,…).
2. Page bg #FFF3E4→#F5F3EE; white surfaces #FFFEFB→#FFFFFF (nav island, secondary CTA,
   icon chips, list card, chart card).
3. Coral→matcha everywhere: logo circle, nav CTA, hero CTA (bg #749B58 + CLAY_CORAL
   matcha shadow), BAR_CORAL bars, focus-visible outline #749B58.
4. ClayToggle: on-state bg #749B58 + rgba(94,127,71,…) shadow; off-state bg #E9E5DC +
   rgba(74,59,50,…) inset; knob stays white with rgba(74,59,50,0.3) shadow.
5. Pastel surfaces: peach #FFDFC7→#E4EFE0; mint #D7F0DF→#DCE9D4; butter #FFEFBF→#EFE9DA;
   rose #FFDCE5→#E8E0D5 (mock cards, features, blobs at same opacity, icon chips, pills).
6. Text: #4A382C→#231F1E; #8A7361→#8A7D72; #6B5544→#4A3B32; #B99E86→#A99C90;
   on-pastel #3E7D57/#4E9668/#FF7A50 icons→#5E7F47; #E8603A/#C0962F/#D2708F icons→#4A3B32;
   #C4557E→#6B5B50; #A87B1E→#8A7D72 (all hover: variants follow).
7. Marquee PILL_COLORS → #FFFFFF/#E4EFE0/#DCE9D4/#EFE9DA/#E8E0D5 with converted
   shadow variants; pill text #4A3B32.
8. Gradients: hero H1 from-[#8FB47A] to-[#5E7F47]; mega footer wordmark
   from-[#A3C48E] to-[#749B58] + drop-shadow rgba(94,127,71,0.25).
9. Bars: BAR_CORAL bg #749B58 + rgba(94,127,71,…) tints; BAR_PEACH bg #E4EFE0 +
   rgba(74,59,50,.20/.12) lighter tints. Habit rows: done #DCE9D4]/60, unchecked
   #F7EBDA]/70→#E9E5DC]/70. Badge "Baru — Mode Fokus" bg #DCE9D4 text #5E7F47.

## neobrutalism.tsx — groups converted
1. bg-amber-100→bg-[#F5F3EE] (section + 4 ticket notch holes). All border-stone-950 and
   #1c1917 hard shadows → #4A3B32 (warm espresso brutal look).
2. Text: text-stone-950→#231F1E (section, ticker); stone-700→#4A3B32; stone-500→#8A7D72;
   stone-400→#A99C90 (done line-through, copyright); stone-300→#E9E5DC (footer links);
   stone-100→#F5F3EE (footer on dark).
3. Dark surfaces: logo box + ticket button bg-stone-950→bg-[#231F1E] (ticket keeps
   text-white; its rgba(0,0,0,.25) shadow→rgba(74,59,50,.25)); footer bg-[#231F1E].
4. CTAs: big hero "Mulai sekarang" bg-[#749B58] text-white + hover:bg-[#5E7F47]
   (press/translate/shadow states kept); nav small CTA bg-[#E4EFE0] text-[#231F1E];
   "Lihat demo" stays white bg.
5. Stickers: "Gratis 30 hari" bg-rose-300→#E4EFE0; "Interaktif" bg-[#FDE047]→#EFE9DA;
   flame chip bg-orange-300→#EFE9DA with Flame icon text-[#4A3B32].
6. Checkbox: done bg-[#749B58] + Check icon text-white; unchecked bg-white +
   hover:bg-[#F5F3EE]. Progress: fill bg-[#749B58], complete state bg-[#A3C48E].
7. Habit tag stickers rotate #E4EFE0/#EFE9DA/#DCE9D4/#E8E0D5 (text inherits #231F1E).
   Stats cards → #E4EFE0/#EFE9DA/#DCE9D4.
8. Doodles rotate brand accents: star fill #A3C48E + stroke #4A3B32; zigzag stroke
   #749B58; asterisk stroke #4A3B32. H1 highlight bg-[#BEF264]→bg-[#A3C48E].

## Verification
- Grep clay: FF7|FFD|FFE|FF9|FFB|F3E2|D7F0|FFB9|FFF3|FFFE|F7EB|4A382C|8A7361|B99E86|
  3E7D57|C4557E|A87B1E|C0962F|E8603A|4E9668|D2708F|6B5544|214,1|96,160|180,130|120,70
  → 0 matches.
- Grep neo: FDE047|FDA4AF|BEF264|FB923C|amber|rose|lime|orange|yellow|stone|#1c1917|
  rgba(0,0,0 → 0 matches.
- `bunx eslint` on both files → clean. dev.log tail → compiled OK, no errors.
