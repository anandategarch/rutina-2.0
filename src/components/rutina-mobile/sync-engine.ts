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

import { useEffect } from 'react'
import { toast } from 'sonner'
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
import type { SyncState } from '@/lib/sync-schema'

/* ===== Konfigurasi ===== */

const DEBOUNCE_MS = 900
const RETRY_QUEUED_MS = 1500
const ERROR_TOAST_COOLDOWN_MS = 120_000
const META_KEY = 'rutina-2.0-sync-meta'

/** Slice domain yang dipush ke server — selaras partialize store. */
const DOMAIN_KEYS = [
  'demoMode',
  'habits',
  'completions',
  'notes',
  'txs',
  'goals',
  'wallets',
  'budgets',
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
] as const

type DomainKey = (typeof DOMAIN_KEYS)[number]

/** Stempel waktu lokal: suntingan terakhir vs sinkronisasi terakhir. */
interface SyncMeta {
  lastEditAt: number
  lastSyncedAt: number | null
}

/* ===== Status modul (singleton — selamat dari StrictMode ganda) ===== */

let bootStarted = false
let ready = false
let suppress = false
let pushTimer: ReturnType<typeof setTimeout> | null = null
let inFlight = false
let queued = false
let lastErrorToast = 0

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
    demoMode: remote.demoMode,
    habits: remote.habits.map((h) => ({
      ...h,
      cat: h.cat as HabitCat,
      schedule: [...h.schedule],
      restDays: [...(h.restDays ?? [])],
      afterId: h.afterId ?? null,
      mini: h.mini ?? '',
    })),
    completions: remote.completions,
    notes: remote.notes.map((n) => ({ ...n, folder: n.folder as FolderKey })),
    txs: remote.txs.map((t) => ({
      ...t,
      type: t.type as TxType,
      cat: t.cat as FinCat,
      walletId: t.walletId ?? undefined,
      toWalletId: t.toWalletId ?? undefined,
      recurrence: (t.recurrence ?? null) as Recurrence | null,
      recurOf: t.recurOf ?? undefined,
    })),
    goals: remote.goals.map((g) => ({ ...g })),
    wallets: remote.wallets.map((w) => ({ ...w })),
    budgets: { ...remote.budgets },
    workouts: remote.workouts.map((w) => ({
      ...w,
      kind: w.kind as WorkoutKind,
      sets: w.sets.map((x) => ({ ...x })),
      distance: w.distance ?? undefined,
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
  })
}

/* ===== Push (PUT /api/state) ===== */

async function push(): Promise<void> {
  if (inFlight) {
    queued = true
    return
  }
  inFlight = true
  try {
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: snapshot() }),
    })
    if (!res.ok) throw new Error(`PUT /api/state → HTTP ${res.status}`)
    patchMeta({ lastSyncedAt: Date.now() })
  } catch (error) {
    console.warn('[sync] push gagal:', error)
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
    const res = await fetch('/api/state', { cache: 'no-store' })
    if (res.ok) remote = (await res.json()) as StateResponse
  } catch (error) {
    console.warn('[sync] GET /api/state gagal (mode offline):', error)
  }

  if (remote?.initialized && remote.state) {
    const meta = readMeta()
    const serverPushAt = remote.syncedAt ? Date.parse(remote.syncedAt) : 0
    const localNewer = (meta?.lastEditAt ?? 0) > (serverPushAt || 0)
    /* Server kosong tetapi perangkat ini punya data (mis. pengguna lama
       dengan histori localStorage, atau server baru di-reset) → data
       lokal diunggah, bukan ditimpa dengan kekosongan. */
    const localBeatsEmpty = isRemoteEmpty(remote.state) && hasLocalData()
    if (localNewer || localBeatsEmpty) {
      /* Ada suntingan lokal yang belum sempat terkirim → unggahkan. */
      await push()
    } else {
      /* Server lebih baru / sejajar → tarik (server-menang). */
      suppress = true
      try {
        applyServerState(remote.state)
        patchMeta({ lastSyncedAt: Date.now() })
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

    return unsub
  }, [])
}

/** Status mesin untuk indikator UI (profil): sudah pernah sinkron? */
export function syncStatus(): { lastSyncedAt: number | null } {
  return { lastSyncedAt: readMeta()?.lastSyncedAt ?? null }
}
