# Task 3-c — Recolor: landing styles to earthy "rutina" brand palette

## Scope
Recolored ONLY (no structure/copy/animation/logic changes) three files:
- `src/components/landing/glass-aurora.tsx`
- `src/components/landing/dashboard-preview.tsx`
- `src/components/landing/typography-driven.tsx`

Palette applied (exact tokens): MATCHA #749B58, MATCHA_DK #5E7F47, MATCHA_LT #A3C48E,
PISTACHIO #E4EFE0, SOFT_MATCHA #DCE9D4 (unused — no matching slot), SAND #F5F3EE,
SAND_DK #E9E5DC (unused — no matching slot), ESPRESSO #4A3B32, DEEP #231F1E,
SURF_DK #2B2523, MUTED #8A7D72, MUTED_LT #A99C90, TAUPE_LT #C9BFB2.
Extra warm traffic-light hexes per spec: #C58B6A, #C09A5C.

## glass-aurora.tsx
- Root: stone-950/stone-100 -> bg-[#231F1E] / text-[#F5F3EE]
- Aurora blobs: emerald-500/25 -> #749B58/30; rose-500/20 -> #E4EFE0/15; amber-400/15 -> #F5F3EE/10 (sizes/blur/motion untouched)
- Logo + hero-heading gradients -> from-[#A3C48E] to-[#E4EFE0]
- All 3 primary CTAs (nav/hero/bottom): white -> bg-[#749B58] text-white hover:bg-[#5E7F47]; "Lihat demo" ghost button keeps white glass styling
- Checkbox done: border-[#A3C48E] bg-[#749B58], Check icon white
- Bars -> from-[#749B58]/80 to-[#A3C48E]/80; progress strip -> from-[#749B58] to-[#A3C48E] (track bg-white/10 kept)
- FEATURES icons + hero badge Sparkles -> text-[#A3C48E]
- All white/white-alpha glass utilities preserved

## dashboard-preview.tsx
- Section bg-zinc-950 -> bg-[#231F1E]; top glow orange-500/10 -> #749B58/12
- Panel -> border-[#4A3B32] bg-[#2B2523]/70 shadow-[#231F1E]/50; chrome bar, URL bar, sidebar, user chip, nav (active bg-[#4A3B32] text-[#F5F3EE], inactive text-[#A99C90] hover #4A3B32/50 -> #E4EFE0) all converted
- Traffic dots -> #C58B6A/80, #C09A5C/80, #749B58/80; logo/avatar gradients -> from-[#749B58] to-[#A3C48E] with white glyph
- Text scale: zinc-100->#F5F3EE, zinc-500->#A99C90, zinc-400->#C9BFB2 (URL bar override #A99C90), zinc-600->#A99C90 (bar labels + "Tandai" override #8A7D72), zinc-50->#F5F3EE
- Streak badge, trend labels, "+12%" badge -> matcha tints; stats: flame/check #A3C48E + #749B58/15, timer/trending #C9BFB2 + #E4EFE0/10
- Progress -> bg-[#4A3B32]/70 with #749B58->#A3C48E fill; habit rows done #749B58/40 + /12, undone espresso/surf with hover #5E7F47/60
- Bar chart: normal bars taupe #8A7D72->#C9BFB2, LAST bar matcha hero #5E7F47->#A3C48E
- HEAT_COLORS -> ['#4A3B32]/80','#749B58]/25','/55','/90']; confetti -> ['#749B58','#A3C48E','#E4EFE0','#5E7F47','#C9BFB2']
- Replay button + header badge -> border-[#4A3B32] bg-[#2B2523] text-[#C9BFB2] hover #4A3B32/60
- Stat/habit/chart/heatmap cards -> border-[#4A3B32] bg-[#2B2523]/60

## typography-driven.tsx
- t object dark branch: bg #231F1E, text #F5F3EE, sub/mono #A99C90, line border-[#F5F3EE]/12, accent #A3C48E, link decoration-[#A3C48E], stroke rgba(245,243,238,0.10)
- t object light branch: bg #F5F3EE, text #231F1E, sub #8A7D72, mono #A99C90, line border-[#231F1E]/10, accent #5E7F47, link decoration-[#749B58], stroke rgba(35,31,30,0.08)
- Marquee "✦" + Letters inherit t.accent automatically; theme toggle logic untouched

## Verification
- Grep legacy tokens: glass-aurora (`emerald|rose|amber|stone`) = 0; dashboard-preview (`orange|amber|rose|emerald|zinc|f97316|fbbf24|34d399|fb7185|a3e635`) = 0; typography-driven (`orange|zinc|stone`) = 0
- `bunx eslint` on all three files: clean (0 errors/warnings)
- dev.log: compiles OK, GET / 200, no errors
- Note: root-level /agent-ctx was not writable; record written to /home/z/my-project/agent-ctx/
