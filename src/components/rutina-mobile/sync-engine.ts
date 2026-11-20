'use client'

/**
 * Sync engine — jembatan store Zustand ↔ /api/state (Turso).
 *
 * Kebijakan:
 *  - OFFLINE-FIRST: localStorage (persist Zustand) tetap menjadi cache
 *    utama; setiap mutasi domain juga dijadwalkan terkirim ke server
 *    (debounce ±0,9 dtk, satu permintaan untuk rentetan aksi cepat).
 *  - BOOT: setelah rehydrate lokal, klien menarik GET /api/state.
 *      · server belum ter-inisialisasi  → ungahkan data lokal (klien
 *        pertama yang membuka aplikasi menetapkan dataset cloud);
 *      · server ter-inisialisasi        → bandingkan stempel waktu:
 *        bila lokal lebih baru (ada suntingan yang belum terkirim),
 *        unggahkan lokal; selain itu tarik state server (server-menang).
 *  - Setelah boot, setiap perubahan slice domain → push ter-debounce.
 *    Kegagalan jaringan tidak menghilangkan data (tetap di localStorage)
 *    dan dicoba ulang pada perubahan berikutnya / boot berikutnya.
 */

import { useEffect, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { createStore } from 'zustand/vanilla'
import { useRutina } from './store'
import type {
  FinCat,
  FolderKey,
  HabitCat,
  MealSlot,
  Recurrence,
  TxType,
  WorkoutKind,
} from './store'
import { FIT_TARGETS_DEFAULT } from './store'
import type { SyncState } from '@/lib/sync-schema'

/* ===== Konfigurasi ===== */

const DEBOUNCE_MS = 900
const RETRY_QUEUED_MS = 1500
const ERROR_TOAST_COOLDOWN_MS = 120_000
const META_KEY = 'rutina-2.0-sync-meta'

/** Slice domain yang dipush ke server — selaras partialize store. */
const DOMAIN_KEYS = [
  'habits',
  'completions',
  'notes',
  'txs',
  'goals',
  'wallets',
  'budgets',
  'customCats',
  'workouts',
  'foodEntries',
  'calorieTarget',
  'bodyLogs',
  'dailyGoal',
  'mood',
  'moodLogs',
  'identityText',
  'deloadUntil',
  'bonusClaimed',
  'quoteSaved',
  'quoteSavedDate',
  /* v2.22 */
  'habitGroups',
  'catRenames',
  'hiddenCats',
  'fitTargets',
] as const

type DomainKey = (typeof DOMAIN_KEYS)[number]

/** Stempel waktu lokal: suntingan terakhir vs sinkronisasi terakhir. */
interface SyncMeta {
  lastEditAt: number
  lastSyncedAt: number | null
}

/* ===== Shared secret opsional (audit v2.16 T5-b #2) =====
   Bila NEXT_PUBLIC_SYNC_TOKEN (klien) & SYNC_TOKEN (server, lihat
   middleware.ts) diisi, seluruh permintaan /api/* membawa header
   x-sync-token. Kosong di sandbox/preview → autentikasi mati
   (perilaku lama tetap). */
const SYNC_TOKEN = process.env.NEXT_PUBLIC_SYNC_TOKEN ?? ''

function syncHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    ...(extra ?? {}),
    ...(SYNC_TOKEN ? { 'x-sync-token': SYNC_TOKEN } : {}),
  }
}

/* ===== Status modul (singleton — selamat dari StrictMode ganda) ===== */

let bootStarted = false
let ready = false
let suppress = false
let pushTimer: ReturnType<typeof setTimeout> | null = null
let inFlight = false
let queued = false
let lastErrorToast = 0

/* ===== Status sinkronisasi reaktif (v2.23) =====
   Empat keadaan yang dibaca UI indikator (sidebar desktop & rail Profil):
     'synced'  — snapshot terakhir berhasil dikirim/ditarik
     'syncing' — perubahan sedang dikirim (push berjalan)
     'offline' — perangkat tanpa koneksi; data aman di localStorage
     'error'   — server merespons gagal / jaringan drop mid-push
   'boot' hanyalah keadaan awal sebelum GET pertama selesai. */
export type SyncKind = 'boot' | 'syncing' | 'synced' | 'offline' | 'error'

export interface SyncStatusState {
  kind: SyncKind
  lastSyncedAt: number | null
}

/* Store vanilla (bukan slice useRutina) — status sinkron bukan data domain
   dan tidak boleh ikut ter-persist/ter-push ke server. */
export const syncStatusStore = createStore<SyncStatusState>()(() => ({
  kind: 'boot',
  lastSyncedAt: null,
}))

function setSyncKind(kind: SyncKind, lastSyncedAt?: number): void {
  syncStatusStore.setState({
    kind,
    lastSyncedAt: lastSyncedAt ?? syncStatusStore.getState().lastSyncedAt,
  })
}

/** Langganan reaktif untuk komponen UI (sidebar, rail Profil). */
export function useSyncStatus(): SyncStatusState {
  return useSyncExternalStore(
    syncStatusStore.subscribe,
    syncStatusStore.getState,
    syncStatusStore.getInitialState,
  )
}

/** Aksi "Coba lagi" pada indikator gagal/offline — dorong snapshot
 *  sekarang; push() sendiri yang menuntaskan transisi status. */
export function retrySync(): void {
  schedulePush(0)
}

/* ===== Meta di localStorage ===== */

function readMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SyncMeta>
    if (typeof parsed.lastEditAt !== 'number') return null
    return {
      lastEditAt: parsed.lastEditAt,
      lastSyncedAt:
        typeof parsed.lastSyncedAt === 'number' ? parsed.lastSyncedAt : null,
    }
  } catch {
    return null
  }
}

function writeMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    /* localStorage penuh/diblokir — abaikan; sinkronisasi tetap jalan. */
  }
}

/** Mutasi meta tanpa menghilangkan pasangan yang ada. */
function patchMeta(patch: Partial<SyncMeta>): void {
  const cur = readMeta() ?? { lastEditAt: 0, lastSyncedAt: null }
  writeMeta({ ...cur, ...patch })
}

/* ===== Snapshot & penerapan state server ===== */

function snapshot(): SyncState {
  const s = useRutina.getState()
  const out = {} as Record<DomainKey, unknown>
  for (const key of DOMAIN_KEYS) out[key] = s[key]
  return out as unknown as SyncState
}

/** Terapkan snapshot server ke store — pemetaan tipe wire → tipe domain.
 *  Nilai berasal dari database yang ditulis aplikasi sendiri, sehingga
 *  cast union aman (kandidat string identik dengan union di store). */
function applyServerState(remote: SyncState): void {
  useRutina.setState({
    habits: remote.habits.map((h) => ({
      ...h,
      cat: h.cat as HabitCat,
      schedule: [...h.schedule],
      restDays: [...(h.restDays ?? [])],
      afterId: h.afterId ?? null,
      mini: h.mini ?? '',
      target: h.target ?? null,
      unit: h.unit ?? null,
      groupId: h.groupId ?? null,
    })),
    completions: remote.completions,
    notes: remote.notes.map((n) => ({ ...n, folder: n.folder as FolderKey })),
    txs: remote.txs.map((t) => ({
      ...t,
      type: t.type as TxType,
      cat: t.cat,
      walletId: t.walletId ?? undefined,
      toWalletId: t.toWalletId ?? undefined,
      recurrence: (t.recurrence ?? null) as Recurrence | null,
      recurOf: t.recurOf ?? undefined,
    })),
    goals: remote.goals.map((g) => ({ ...g })),
    wallets: remote.wallets.map((w) => ({ ...w })),
    budgets: { ...remote.budgets },
    customCats: (remote.customCats ?? []).map((c) => ({
      ...c,
      type: c.type as TxType,
    })),
    workouts: remote.workouts.map((w) => ({
      ...w,
      kind: w.kind as WorkoutKind,
      sets: w.sets.map((x) => ({ ...x })),
      distance: w.distance ?? undefined,
      kcal: w.kcal ?? undefined,
    })),
    foodEntries: remote.foodEntries.map((f) => ({
      ...f,
      meal: f.meal as MealSlot,
    })),
    calorieTarget: remote.calorieTarget,
    /* Wire memakai `null` untuk "tidak diisi" (lihat bodyLogSchema), sedangkan
       domain BodyLog memakai `undefined` — normalisasi saat diterapkan. */
    bodyLogs: Object.fromEntries(
      Object.entries(remote.bodyLogs).map(([date, log]) => [
        date,
        {
          water: log.water,
          weight: log.weight ?? undefined,
          sleepH: log.sleepH ?? undefined,
          energy: log.energy ?? undefined,
          soreness: log.soreness ?? undefined,
          stress: log.stress ?? undefined,
        },
      ]),
    ),
    dailyGoal: remote.dailyGoal,
    mood: remote.mood,
    moodLogs: { ...(remote.moodLogs ?? {}) },
    identityText: remote.identityText ?? '',
    deloadUntil: remote.deloadUntil ?? null,
    bonusClaimed: remote.bonusClaimed,
    quoteSaved: remote.quoteSaved,
    quoteSavedDate: remote.quoteSavedDate ?? null,
    /* v2.22 */
    habitGroups: (remote.habitGroups ?? []).map((g) => ({ ...g })),
    catRenames: { ...(remote.catRenames ?? {}) },
    hiddenCats: [...(remote.hiddenCats ?? [])],
    fitTargets: { ...(remote.fitTargets ?? FIT_TARGETS_DEFAULT) },
  })
}

/* ===== Push (PUT /api/state) ===== */

async function push(): Promise<void> {
  if (inFlight) {
    queued = true
    return
  }
  inFlight = true
  setSyncKind('syncing')
  try {
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: syncHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ state: snapshot() }),
    })
    if (!res.ok) throw new Error(`PUT /api/state → HTTP ${res.status}`)
    const now = Date.now()
    patchMeta({ lastSyncedAt: now })
    setSyncKind('synced', now)
  } catch (error) {
    console.warn('[sync] push gagal:', error)
    setSyncKind(
      typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'offline'
        : 'error',
    )
    notifyError()
  } finally {
    inFlight = false
    if (queued) {
      queued = false
      schedulePush(RETRY_QUEUED_MS)
    }
  }
}

function schedulePush(delay = DEBOUNCE_MS): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void push()
  }, delay)
}

/** Apakah ada suntingan lokal yang belum berhasil terkirim? Kedua
 *  stempel dicatat jam perangkat ini (bukan jam server) sehingga
 *  perbandingannya jujur lintas perangkat. */
function hasUnsyncedEdits(): boolean {
  const meta = readMeta()
  return (meta?.lastEditAt ?? 0) > (meta?.lastSyncedAt ?? 0)
}

/** Bilas suntingan tertunda TANPA debounce — dipakai saat tab akan
 *  disembunyikan/ditutup (visibilitychange/pagehide): jendela debounce
 *  900 ms bisa terpotong oleh itu dan suntingan tercecer sampai tab
 *  dibuka lagi. Penjaga in-flight ada di push() sendiri (dijadwalkan
 *  ulang otomatis bila push lain sedang berjalan — tidak dobel). */
function flushPendingEdits(): void {
  /* Negosiasi boot belum tuntas / snapshot server sedang diterapkan —
     boot() sendiri yang menuntaskan nasib suntingan lokal. */
  if (!ready || suppress) return
  if (!hasUnsyncedEdits()) return
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  void push()
}

function notifyError(): void {
  if (Date.now() - lastErrorToast < ERROR_TOAST_COOLDOWN_MS) return
  lastErrorToast = Date.now()
  toast.error('Gagal menyinkronkan ke cloud', {
    description: 'Perubahan tetap tersimpan di perangkat — akan dicoba lagi.',
    duration: 4000,
  })
}

/* ===== Boot ===== */

interface StateResponse {
  initialized: boolean
  state: SyncState | null
  syncedAt: string | null
}

/** Deteksi data contoh warisan (v≤2.18) lewat pola id seed lama.
 *  Pengguna yang dulu memilih "pakai contoh" masih membawa id ini di
 *  localStorage — data itu tidak boleh menimpa server yang berisi
 *  histori asli (impor Rutina 1.0), seberapa pun suntingan lokalnya. */
function hasLegacyDemoSeed(): boolean {
  const s = useRutina.getState()
  return (
    s.habits.some((h) => /^h[1-6]$/.test(h.id)) ||
    s.notes.some((n) => /^n[1-6]$/.test(n.id)) ||
    s.txs.some((t) => t.id.startsWith('f-')) ||
    s.wallets.some((w) => w.id.startsWith('w-')) ||
    s.goals.some((g) => /^g-\d+$/.test(g.id))
  )
}

/** Apakah snapshot server benar-benar kosong (belum ada data domain)? */
function isRemoteEmpty(remote: SyncState): boolean {
  return (
    remote.habits.length === 0 &&
    Object.keys(remote.completions).length === 0 &&
    remote.notes.length === 0 &&
    remote.txs.length === 0 &&
    remote.goals.length === 0 &&
    remote.wallets.length === 0 &&
    remote.workouts.length === 0 &&
    remote.foodEntries.length === 0 &&
    Object.keys(remote.bodyLogs).length === 0
  )
}
/** Apakah store lokal memiliki data domain berarti? */
function hasLocalData(): boolean {
  const s = useRutina.getState()
  return (
    s.habits.length > 0 ||
    Object.keys(s.completions).length > 0 ||
    s.notes.length > 0 ||
    s.txs.length > 0 ||
    s.goals.length > 0 ||
    s.wallets.length > 0 ||
    s.workouts.length > 0 ||
    s.foodEntries.length > 0 ||
    Object.keys(s.bodyLogs).length > 0
  )
}

async function boot(): Promise<void> {
  /* 1. Pulihkan histori lokal (pola skipHydration — bebas mismatch). */
  try {
    await useRutina.persist.rehydrate()
  } catch (error) {
    console.warn('[sync] rehydrate lokal gagal:', error)
  }

  /* 2. Tarik status server. */
  let remote: StateResponse | null = null
  try {
    const res = await fetch('/api/state', {
      cache: 'no-store',
      headers: syncHeaders(),
    })
    if (res.ok) {
      remote = (await res.json()) as StateResponse
    } else {
      setSyncKind('error')
    }
  } catch (error) {
    console.warn('[sync] GET /api/state gagal (mode offline):', error)
    setSyncKind('offline')
  }

  if (remote?.initialized && remote.state) {
    const meta = readMeta()
    const serverPushAt = remote.syncedAt ? Date.parse(remote.syncedAt) : 0
    /* Bandingkan dalam SATU ranah waktu: lastEditAt & lastSyncedAt
       keduanya tercatat dengan jam perangkat ini. Memakai remote.syncedAt
       (jam server) rapuh terhadap selisih jam — bila jam server maju Δ,
       suntingan lokal yang dibuat < Δ sejak push terakhir terlihat "tidak
       lebih baru" lalu tertimpa snapshot server (hilang senyap).
       Fallback ke jam server hanya bila perangkat belum pernah sinkron
       sama sekali (lastSyncedAt kosong — belum ada patokan jam lokal). */
    const lastSynced = meta?.lastSyncedAt ?? 0
    const localNewer =
      lastSynced > 0
        ? (meta?.lastEditAt ?? 0) > lastSynced
        : (meta?.lastEditAt ?? 0) > (serverPushAt || 0)
    /* v2.16 (audit T5-e #1/#3) — dua vektor kehilangan data ditutup:
       (a) data contoh warisan (seed demo v≤2.18 yang masih tersisa di
       localStorage perangkat lama) TIDAK boleh menimpa server yang sudah
       berisi data nyata, seberapa pun suntingan lokal pada data contoh;
       (b) server yang di-reset kosong secara sengaja (mis. "Mulai bersih"
       dari perangkat lain) tidak boleh dihidupkan ulang oleh perangkat
       lain yang masih memegang data lama. localBeatsEmpty kini hanya
       berlaku bagi lokal yang belum pernah sinkron sama sekali
       (unggah pertama histori lokal) — dan bukan data contoh. */
    const demoSeed = hasLegacyDemoSeed()
    const neverSynced = (meta?.lastSyncedAt ?? 0) === 0
    const localBeatsEmpty =
      isRemoteEmpty(remote.state) && hasLocalData() && neverSynced && !demoSeed
    if ((localNewer && !demoSeed) || localBeatsEmpty) {
      /* Ada suntingan lokal yang belum sempat terkirim → unggahkan. */
      await push()
    } else {
      /* Server lebih baru / sejajar → tarik (server-menang). */
      suppress = true
      try {
        applyServerState(remote.state)
        const now = Date.now()
        patchMeta({ lastSyncedAt: now })
        setSyncKind('synced', now)
      } finally {
        suppress = false
      }
    }
  } else if (remote) {
    /* Server hidup namun dataset belum ada → klien pertama menetapkan. */
    await push()
  }
  /* remote === null → offline: tetap hidup dari localStorage. */

  /* 3. Transaksi berulang yang jadwalnya tiba (bisa memicu push). */
  try {
    useRutina.getState().materializeRecurring()
  } catch (error) {
    console.warn('[sync] materializeRecurring gagal:', error)
  }

  ready = true
}

/* ===== Hook ===== */

/** Pasang sekali di shell aplikasi (RutinaApp): boot + langganan push. */
export function useSyncEngine(): void {
  useEffect(() => {
    if (!bootStarted) {
      bootStarted = true
      void boot()
    }

    const unsub = useRutina.subscribe((s, prev) => {
      let changed = false
      for (const key of DOMAIN_KEYS) {
        if (s[key] !== prev[key]) {
          changed = true
          break
        }
      }
      if (!changed) return
      /* Suntingan lokal dicatat SEKARANG (bukan saat push) agar boot
         berikutnya tahu ada perubahan yang mungkin belum terkirim. */
      if (!suppress) patchMeta({ lastEditAt: Date.now() })
      if (!ready || suppress) return
      schedulePush()
    })

    /* Koneksi datang/pergi — indikator status ikut bernapas: saat kembali
       online, dorong perubahan tertunda (bila ada) atau cukup pulihkan
       keadaan "tersinkron". */
    const onOnline = () => {
      if (hasUnsyncedEdits()) {
        schedulePush(0)
      } else if (syncStatusStore.getState().kind === 'offline') {
        setSyncKind('synced')
      }
    }
    const onOffline = () => setSyncKind('offline')

    /* Tab disembunyikan/ditutup — bilas sekarang sebelum jendela debounce
       terpotong; fokus kembali — bila push terakhir gagal dan masih ada
       suntingan tertunda, jadwalkan satu retry (sekali per event, tanpa
       loop). */
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPendingEdits()
    }
    const onPageHide = () => flushPendingEdits()
    const onFocus = () => {
      if (!hasUnsyncedEdits()) return
      const kind = syncStatusStore.getState().kind
      if (kind === 'error' || kind === 'offline') schedulePush(0)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('focus', onFocus)

    return () => {
      unsub()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
}

/** Status mesin untuk indikator UI (profil): sudah pernah sinkron? */
export function syncStatus(): { lastSyncedAt: number | null } {
  return { lastSyncedAt: readMeta()?.lastSyncedAt ?? null }
}

/** Tarik paksa snapshot server dan terapkan ke store — melewati negosiasi
 *  stempel waktu (selalu server-menang). Dipakai tombol "Tarik ulang dari
 *  cloud" di Profil, mis. setelah impor data Rutina 1.0 di sisi server.
 *  lastEditAt di-nol-kan agar boot berikutnya tidak mengunggah ulang state
 *  lama yang baru saja ditimpa. */
export async function forcePull(): Promise<boolean> {
  setSyncKind('syncing')
  try {
    const res = await fetch('/api/state', {
      cache: 'no-store',
      headers: syncHeaders(),
    })
    if (!res.ok) {
      setSyncKind('error')
      return false
    }
    const remote = (await res.json()) as StateResponse
    if (!remote?.initialized || !remote.state) {
      setSyncKind('error')
      return false
    }
    suppress = true
    try {
      applyServerState(remote.state)
      const now = Date.now()
      patchMeta({ lastSyncedAt: now, lastEditAt: 0 })
      setSyncKind('synced', now)
    } finally {
      suppress = false
    }
    return true
  } catch (error) {
    console.warn('[sync] forcePull gagal:', error)
    setSyncKind(
      typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'offline'
        : 'error',
    )
    return false
  }
}

/* ===== Ekspor & impor cadangan (v2.22) ===== */

/** Snapshot domain saat ini dalam bentuk wire SyncState — dipakai tombol
 *  "Unduh cadangan JSON" di Profil. Bentuk identik dengan yang dipush ke
 *  /api/state sehingga hasil unduhan bisa langsung dipulihkan lewat
 *  importBackup() atau PUT manual. */
export function exportBackup(): SyncState {
  return snapshot()
}

/** Pulihkan cadangan JSON ke store — validasi bentuk minimal di sisi
 *  klien (berasal dari berkas pengguna sendiri), lalu terapkan lewat jalur
 *  yang sama dengan applyServerState sehingga pemetaan tipe konsisten.
 *  Mengembalikan pesan error bila berkas tidak dikenali. */
export async function importBackup(raw: string): Promise<string | null> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return 'Berkas bukan JSON yang valid.'
  }
  /* Terima dua bentuk: snapshot murni ATAU pembungkus { state } yang
     persis seperti format PUT /api/state. */
  const candidate =
    parsed && typeof parsed === 'object' && 'state' in (parsed as Record<string, unknown>)
      ? (parsed as { state: unknown }).state
      : parsed
  const c = candidate as Partial<SyncState> | null
  if (!c || typeof c !== 'object' || !Array.isArray(c.habits) || !Array.isArray(c.txs)) {
    return 'Berkas bukan cadangan Rutina yang dikenali.'
  }
  suppress = true
  try {
    applyServerState({
      habits: [],
      completions: {},
      notes: [],
      txs: [],
      goals: [],
      wallets: [],
      budgets: {},
      customCats: [],
      workouts: [],
      foodEntries: [],
      calorieTarget: c.calorieTarget ?? 2000,
      bodyLogs: {},
      dailyGoal: c.dailyGoal ?? 4,
      mood: c.mood ?? null,
      moodLogs: c.moodLogs ?? {},
      identityText: c.identityText ?? '',
      deloadUntil: c.deloadUntil ?? null,
      bonusClaimed: c.bonusClaimed ?? false,
      quoteSaved: c.quoteSaved ?? false,
      quoteSavedDate: c.quoteSavedDate ?? null,
      habitGroups: c.habitGroups ?? [],
      catRenames: c.catRenames ?? {},
      hiddenCats: c.hiddenCats ?? [],
      fitTargets: c.fitTargets ?? FIT_TARGETS_DEFAULT,
      ...c,
    } as SyncState)
    patchMeta({ lastEditAt: Date.now() })
  } finally {
    suppress = false
  }
  /* Perubahan domain tercatat; push terjadwal lewat langganan store. */
  schedulePush()
  return null
}
