# Catatan Infrastruktur Sandbox — Insiden Mount Upload (19 Nov 2026)

## Situasi
Mount platform `/home/z/my-project/upload` (ossfs, bridge unggahan) mati
pada ±15:26. `readdir`/`open` di dalamnya menggantung selamanya (D state).
Akibat: `git status`, worker postcss, dan kompilasi dev server beku >3 jam.

## Solusi aktif (sampai mount platform hidup kembali)
1. **Dev server dijalankan dari `/tmp/projcopy`** (clone hardlink — file
   identik via inode dengan `/home/z/my-project`). Port 3000 ✓, log
   di-tee ke `/home/z/my-project/dev.log`.
   - Edit file di `/home/z/my-project` → otomatis muncul di server
     (hardlink, Write/Edit tool menulis in-place).
   - **File BARU harus di-hardlink manual**:
     `ln /home/z/my-project/<path> /tmp/projcopy/<path>`
   - Hapus file di my-project TIDAK menghapus di projcopy (inode tetap).
2. **Operasi git SELALU dari `/tmp/projcopy`** (`.git` hardlink sama,
   path sehat): `cd /tmp/projcopy && git add -A && git commit && git push`.
   JANGAN `git status/add` di `/home/z/my-project` — akan hang.
3. `postcss.config.mjs` membatasi basis scan Tailwind ke `src/` —
   pipeline CSS kebal terhadap direktori mount.
4. File upload warisan sudah di-untrack dari index git (v2.24).

## Jangan lakukan
- `ls /home/z/my-project/upload/` (hang)
- `git status` di my-project (hang sampai mount hidup)
- `bun run dev` duplikat / mematikan server :3000 yang sedang jalan
  (cek dulu `ss -tlnp | rg 3000`)

## Pemulihan data
Snapshot sandbox sempat tertimpa data uji → dipulihkan via
`bun scripts/pull-production.ts` (18 kebiasaan · 281 transaksi · 4 dompet
· 3 tujuan, dari produksi Vercel+Turso). Transaksi uji warisan dibersihkan.

## Verifikasi kebugaran setelah pemulihan
`curl -s localhost:3000/api/state` → habits 18 · txs 281 · wallets 4.
