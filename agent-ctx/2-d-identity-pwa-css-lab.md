# Task 2d — Identity, PWA & CSS Lab (agent: identity-pwa-css-lab)

Scope: audit items #23 (Suara Identitas), #25 (Riwayat Mood), #26 (CSS Lab), #27 (PWA offline shell).
All UI text Bahasa Indonesia. No changes to frozen files (store.ts, sheets, screens lain, prisma, app dir).

## Files created / modified

### NEW `public/sw.js` — offline shell service worker (plain JS, no build)
- `VERSION = 'rutina-2.0-v1'`, `SHELL_CACHE = VERSION + '-shell'`, `STATIC_CACHE = VERSION + '-static'`.
- install: precaches `/` + `/manifest.webmanifest` (verified: route exists, 200 `application/manifest+json` in Next 16) **asset-by-asset** via `fetch(new Request(url, { cache: 'reload' })) + cache.put` wrapped in try/catch — a single 404 can never abort the install (avoids `cache.addAll` atomic failure). `skipWaiting()`.
- activate: deletes caches not starting with `VERSION`, `clients.claim()`.
- fetch handler:
  - GET only; cross-origin requests and `/api/**` pass straight through (API = network-only, never cached — data freshness; app is offline-first via localStorage anyway).
  - `request.mode === 'navigate'` → network-first; on success clones 200 responses into SHELL_CACHE; on failure → `caches.match(request) || caches.match('/')` (offline shell) with `Response.error()` as last resort.
  - Static assets (`/_next/static/**`, `/icons/**`, `/logo.svg`, `/favicon.ico`, `/robots.txt`, `/manifest.webmanifest`, plus any request with destination image/font/style/script) → stale-while-revalidate (serve cache, refresh in background).
  - Everything else same-origin (RSC etc.) is not intercepted.
- Every cache op individually caught — fetch handler never rejects. Lint-clean (`eslint .` covers public/sw.js; passes). `node --check` OK; served with `application/javascript` MIME.

### `src/components/rutina-mobile/rutina-app.tsx` — MINIMAL edit (+10 lines)
- New `useEffect` right after `useSyncEngine()`: registers `/sw.js` client-only when `'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')`, `.catch(() => {})`. Nothing else touched.

### NEW `src/components/rutina-mobile/css-lab.tsx` — CSS Lab (`CssLab({ open, onClose })`)
- 17 curated effects in 6 categories (Kartu 3, Teks 4, Latar 3, Gerak 3, Umpan Balik 2, Beban 2 — spec listed 17 items though headline said 16):
  - Kartu: Kartu Kaca (backdrop-filter), Bingkai Gradien (padding-box/border-box), Terangkat saat Disorot (hover lift).
  - Teks: Cahaya Neon (text-shadow layers), Teks Gradien (background-clip: text), Mesin Tik (steps() width + caret), Teks Berkilau (background-position).
  - Latar: Gradien Hidup (hue-rotate), Kisi Titik (radial-gradient), Tekstur Noise (feTurbulence SVG data-uri).
  - Gerak: Mengapung, Cincin Denyut (box-shadow ring), Blob Bermorf (border-radius keyframes).
  - Umpan Balik: Riak Tombol (::after scale on :active), Skala Tekan (active scale).
  - Beban: Kerangka Berkilau (skeleton), Spinner Konik (conic-gradient + mask).
- Overlay follows design-board.tsx patterns exactly: AnimatePresence, backdrop z-[65], spring-sheet panel z-[70] inside `CONTENT_W`, `useFocusTrap`, Escape to close, safe-area padding.
- Toolbar: search Input (filters title/category/id, case-insensitive) + scrollable category chips (aria-pressed, "Semua" + 6). Filters reset on each open.
- Effect cards: 96px live preview on sand `#ECE8DC` (glass preview has decorative color blobs so blur reads), title + category + chevron toggle (aria-expanded) expanding a `<pre>` with the full copyable CSS, footer shows `.fx-{id}` + "Salin CSS" button (Copy → Check "Tersalin" for 1.6s; `navigator.clipboard.writeText` → toast "CSS disalin"; error toast on failure).
- Effect cores are raw CSS (no Tailwind): one `<style>` tag renders `scopeCss(all class rules)` + raw `@keyframes` + reduced-motion guard; `scopeCss` prefixes every rule with `.css-lab-scope` (verified with a script: 22/22 rules prefixed, 0 leaks, all 9 fxk-* keyframes defined). Copy string = standalone class rules + its keyframes. Guard: `@media (prefers-reduced-motion: reduce) { .css-lab-scope *, ::before, ::after { animation: none !important; transition: none !important } }` (typewriter keeps base `width: 13ch` so text stays visible when animations are off). Style tag unmounts with the panel — zero global leakage.
- Ripple/press previews are real `<button>`s OUTSIDE the card's toggle button (no nested interactive elements; previews stay pressable so :active demos work).

### `src/components/rutina-mobile/design-board.tsx` — CSS Lab entry (+24 lines, no restructuring)
- Header now has a "CSS Lab" pill button (FlaskConical icon, aria-label) next to the close button; `labOpen` local state; `<CssLab open={labOpen} onClose={...} />` rendered inside the board's AnimatePresence (sibling of panel) so it layers above (z-65/70 vs board 55/60).
- Escape layering: board's Escape handler ignores Escape while `labOpen` (lab's own handler closes the lab) — one keypress closes one layer. All existing board sections/tabs untouched.

### `src/components/rutina-mobile/screens/profile.tsx` — two new sections (all existing sections preserved)
- Placed after the stats row, before FOCUS_WORDS chips (identity context near profile header). Both use the standard card pattern (`rounded-[20px] border-border bg-surface-primary p-5 shadow-soft`, m.section fade+y entrance).
- **Suara Identitas** (Fingerprint icon): display mode = quote figure (oversized `"` mark, `playfair` italic 18px, "Suara identitasku" caption, Pencil edit button); empty = warm serif prompt "Siapa yang ingin kamu jadi lewat kebiasaan ini?" + "Tulis identitasku" button; edit mode = textarea (placeholder "Aku menjadi orang yang…", rows 4, input sliced to 600) + helper "Tulis identitas yang ingin kamu bangun — bukan target, melainkan siapa dirimu." + counter `{n}/600` + Batal/Simpan (RutinaButton). Save → `setIdentityText(draft.trim())` + toast "Suara identitas tersimpan."
- **Riwayat Mood** (HeartPulse icon): 14-day strip oldest→newest via `addDaysISO(today, -back)`; each column = weekday initial (`WEEKDAY_MIN[getDay()]`) + mood icon (local `MOOD_ICONS` map replicated from checkin-sheet since it is not exported: Ceria=Laugh, Baik=Smile, Biasa=Meh, Lelah=BatteryLow) colored `MOOD_TONE` (Ceria #749B58, Baik #A3C489, Biasa #C7A17A, Lelah #8A7460) or muted `Minus` when no log; today highlighted (`bg-secondary/60 ring-1 ring-primary/30`, brighter label). Each day has title + aria-label (`shortDateLabel + mood`). Below: "Rekap 14 hari" + per-mood counts "Ceria 5× · Baik 4× …" (only moods with count > 0, dot separators). Empty period → RutinaEmptyState + "Isi check-in hari ini" button calling `useCheckInSheet.getState().openCheckIn()` (module-level zustand store imported from checkin-sheet — import only). Bonus: small "+ Check-in" header button appears when there is history but today has no log yet.

## Verification
- `bun run lint` → clean (zero output, exit 0); explicit per-file lint also exit 0.
- `node --check public/sw.js` OK; `curl /sw.js` → 200 `application/javascript`; `curl /manifest.webmanifest` → 200.
- Page 200, dev.log free of errors; scopeCss transform verified programmatically (22/22 rules scoped, 9/9 keyframes resolved).

## Deviations
- Spec said "curated 16" but enumerated 17 effects — implemented all 17 as listed.
- Board has no tab bar, so the CSS Lab entry is a header button (spec allowed either).
- Glass preview includes decorative gradient blobs (preview scenery, not part of the copyable effect) so `backdrop-filter` is actually visible.
