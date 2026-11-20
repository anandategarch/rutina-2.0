# Fix Agent 5-a — Keuangan Vault engineering fixes (v2.37 audit)

Task ID: 5-a. Scope: `src/components/rutina-mobile/screens/keuangan.tsx` + `src/components/rutina-mobile/finance/**`. No other files touched.

## Fixes applied

### 1. FinChart period switch MORPH (P1)
- `finance/fin-chart.tsx`:
  - Removed `initial={reducedMotion ? false : { height: BAR_MIN }}` and the stagger `delay: Math.min(i * 0.045, 0.5)` from both bar spans — bars now only carry `animate={{ height }}` + `transition={chartBar}` (= `spring.chart` from `@/lib/motion/transitions`), so data changes morph height instead of regrowing from zero.
  - Changed bar key from `` `${p.label}-${i}` `` → `key={i}` (index keys, Observatory stats.tsx pattern) so DOM nodes are REUSED across period switches and heights morph; comment documents the rationale (Indonesian).
  - Removed now-unused `useReducedMotion` import/usage. Docstring notes the morph behavior.
- `keuangan.tsx` (Arus Kas section):
  - Summary chips: removed `AnimatePresence mode="wait"` + `<m.div key={period} initial/exit>` wrapper → plain `<div className="mt-3.5">`; values update IN PLACE.
  - Chart: removed `AnimatePresence` + `key={period}` remount; the wrapper is now `<m.div initial={firstArusKas ? {opacity:0,y:10} : false}>` gated by `useFirstVisit('keuangan-arus-kas')` (hook added in KeuanganScreen).
  - Detail rows: removed both keyed AnimatePresence blocks (`${period}-${activeIdx}` head label + 3-col grid) → plain `<p>`/`<div>`; text swaps in place. `aria-live="polite"` container kept.
  - Rewrote the "remount per ganti periode" comment to describe morphing.

### 2. BlurFade anti-replay gates + delay tokens
All 11 BlurFade in keuangan.tsx got `visitKey` + tokenized delays (motionTokens was already imported):
- `keuangan-saldo` (no delay), `keuangan-jatah` (0.03→delay.micro), `keuangan-aktivitas` (0.06→delay.tight), `keuangan-arus-kas` (0.08→delay.step), `keuangan-anggaran-tujuan` (0.1→delay.normal), `keuangan-komposisi` (0.13→delay.relaxed), `keuangan-temuan` (0.14→delay.relaxed), `keuangan-mutasi` (0.04→delay.micro), `keuangan-tab-anggaran` (0.04→delay.micro), `keuangan-dompet` (0.04→delay.micro), `keuangan-riwayat-transfer` (0.08→delay.step).

### 3. Un-gated progress bars (P2)
- Budget TOTAL bars (ringkasan card + anggaran tab): `initial={{scaleX:0}}` → `initial={firstBudgetTotal ? {scaleX:0} : false}` with `useFirstVisit('keuangan-anggaran-total')` (one hook in KeuanganScreen, used by both bars — same one-key-many-rows pattern as BudgetRow's 'fin-budget-row').
- Wallet flow bars (WalletCard, both masuk/keluar): gated with `useFirstVisit('keuangan-wallet-flow')` added inside WalletCard.
- `finance/allowance-card.tsx` pace bar: gated with `useFirstVisit('keuangan-allowance-pace')` (separate from the existing 'fin-allowance-count' Counter gate, per instruction).

### 4. SaldoCard polish
- `rounded-2xl` → `rounded-[var(--layout-hero-radius)]` (hero token, matches home.tsx/kebiasaan.tsx usage; vault layout = 1.75rem).
- Saldo row: added `min-w-0` to the flex row and `truncate` to the amount span (10-digit saldo clips with ellipsis instead of overflowing the overflow-hidden card).
- `whileTap 0.985` → `0.97`.

### 5. useCatMeta stability (P2 perf)
`finance/use-cat-meta.ts`: hook now returns `useCallback((cat) => catMetaOf(cat, customCats, catRenames), [customCats, catRenames])` — stable identity fixes MutasiWorkspace `filtered` memo and KeuanganScreen `findings` memo automatically (their `catMeta` deps stop changing every render). keuangan.tsx memo deps NOT changed, per instruction.

### 6. Mutasi workspace breakpoint unification (P3)
Verified container context exists: `rutina-app.tsx:211` root div has `@container`; KeuanganScreen renders inside it (app-frame desktop grid: sidebar 240px + main area). Changed:
- `<MutasiWorkspace className="mt-3 hidden lg:block">` → `hidden @[52rem]:block`
- `<MutasiPhoneList className="mt-3 lg:hidden">` → `@[52rem]:hidden`
Matches the Vault 4:8 split threshold (@[52rem] = 832px container) — fixes the cramped 1024–1119px viewport case. Updated the MutasiWorkspace docstring + inline comment accordingly.

### 7. Hand-rolled bento grid gap (P3)
Ringkasan 12-col grid: `gap-[var(--layout-gap)]` → `gap-[var(--layout-grid-gap)]` — mirrors RutinaBentoGrid exactly (it uses `--layout-grid-gap` in stacked AND multi-col states). The outer section stack, KIRI col-4 flex, and dompet tab flex columns intentionally KEEP `--layout-gap` (those are section stacks, not bento grids). Comment added explaining the token contract.

### 8. Donut accessibility (P3)
CompositionDonut ResponsiveContainer wrapper: added `role="img"` + `aria-label={`Donat pengeluaran bulan ini — total ${formatIDRShort(total)}`}` (formatIDRShort matches the visible center value). Per-category navigation remains available via the legend buttons.

### 9. Press scale normalization
- keuangan.tsx TxRow body: `whileTap 0.99` → `0.97`; SaldoCard `0.985` → `0.97`.
- finance/transfer-sheet.tsx submit button: `whileTap 0.98` → `0.97`.
- 0.92 keypad buttons (transfer/add-tx) and CSS `active:scale-*` classes intentionally untouched (small-element convention / separate CSS press layer per tokens.ts governance).

## Verification
- `bunx tsc --noEmit`: ZERO errors in my files. (26 errors currently exist in `screens/stats.tsx` — owned by another agent, appeared mid-edit AFTER my first clean typecheck; not mine.)
- `bun run lint`: clean, exit 0, no warnings.
- dev.log: all `✓ Compiled` after edits, GET / 200.

## Notes / deviations
- Chart gate key 'keuangan-arus-kas' is intentionally SHARED between the Arus Kas BlurFade (visitKey) and the chart m.div gate — both mount/unmount together, so both see first-visit=true on first mount and false afterwards (consistent gating, same semantic block).
- Detail-row AnimatePresence removal also removes the small crossfade when tapping a different bar (not just period switch) — per instruction "REMOVE ... entrance/exit animations for ... detail rows; just no re-entrance". Values swap instantly; aria-live still announces.
