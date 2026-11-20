import { db, isTurso } from '@/lib/db'
import { ensureSchema } from '@/lib/db-migrate'
import {
  SYNC_SETTING_KEYS,
  type SyncState,
  type HabitWire,
  type NoteWire,
  type TxWire,
  type WorkoutWire,
  type FoodEntryWire,
  type CustomCatWire,
} from '@/lib/sync-schema'

/* =====================================================================
 * Lapisan baca/tulis snapshot penuh — dipakai GET/PUT /api/state.
 *
 * Kebijakan data (aplikasi personal, satu pengguna):
 *  - PUT /api/state mengganti seluruh isi tabel rutina_* dalam SATU
 *    transaksi array (deleteMany → createMany) lalu menandai
 *    sync.initialized — sehingga snapshot server selalu konvergen
 *    dengan state klien terakhir yang menulis.
 *  - GET /api/state melaporkan `initialized` — klien baru memakainya
 *    untuk memutuskan: server-menang (tarik) atau unggah lokal.
 * ===================================================================== */

export interface FullStateResult {
  initialized: boolean
  state: SyncState | null
  backend: 'turso' | 'sqlite-local'
  syncedAt: string | null
}

function parseSchedule(json: string): number[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as number[]) : []
  } catch {
    return []
  }
}

function parseRestDays(json: string | null): string[] {
  try {
    const parsed = json ? JSON.parse(json) : []
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function parseSets(json: string): WorkoutWire['sets'] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as WorkoutWire['sets']) : []
  } catch {
    return []
  }
}

/** Aman baca JSON array string dari kolom autoWo. */
function parseAutoWo(json: string | null | undefined): string[] {
  try {
    const parsed = json ? JSON.parse(json) : []
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

/** Aman baca nilai base provenance (boolean | number) dari kolom. */
function parseAutoBase(
  json: string | null | undefined,
): boolean | number | undefined {
  if (json == null || json === '') return undefined
  try {
    const parsed = JSON.parse(json)
    return typeof parsed === 'boolean' || typeof parsed === 'number'
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

/** Aman baca JSON objek dari AppSetting — null saat kosong/rusak. */
function parseJsonSetting<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/* ===== Baca snapshot penuh ===== */

export async function readFullState(): Promise<FullStateResult> {
  /* v2.18: pastikan skema backend mutakhir (tabel/kolom baru dibuat
     otomatis — menyembuhkan drift Turso tanpa token push). */
  await ensureSchema()
  const [
    habits,
    logs,
    notes,
    wallets,
    txs,
    budgets,
    goals,
    workouts,
    foods,
    bodyLogs,
    moodLogs,
    settings,
    customCats,
    habitGroups,
  ] = await Promise.all([
    db.habit.findMany(),
    db.habitLog.findMany(),
    db.journalNote.findMany(),
    db.wallet.findMany(),
    db.transaction.findMany(),
    db.budget.findMany(),
    db.goal.findMany(),
    db.workoutSession.findMany(),
    db.foodEntry.findMany(),
    db.bodyLog.findMany(),
    db.moodLog.findMany(),
    db.appSetting.findMany(),
    db.finCategory.findMany(),
    db.habitGroup.findMany(),
  ])

  const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
  const initialized =
    settingsMap.get(SYNC_SETTING_KEYS.initialized) === 'true'

  const result: FullStateResult = {
    initialized: false,
    state: null,
    backend: isTurso ? 'turso' : 'sqlite-local',
    syncedAt: settingsMap.get(SYNC_SETTING_KEYS.lastPushAt) ?? null,
  }
  if (!initialized) return result

  /* completions[tanggal][habitId] = true | number (progres parsial — v2.22).
     habitAuto (audit v2.37 §4D) direkonstruksi dari kolom provenance
     HabitLog: autoBase + autoWo. */
  const completions: SyncState['completions'] = {}
  const habitAuto: SyncState['habitAuto'] = {}
  for (const log of logs) {
    ;(completions[log.date] ??= {})[log.habitId] =
      log.value == null ? true : log.value
    const woIds = parseAutoWo(log.autoWo)
    if (woIds.length > 0) {
      ;(habitAuto[log.habitId] ??= {})[log.date] = {
        base: parseAutoBase(log.autoBase),
        wo: woIds,
      }
    }
  }

  /* bodyLogs[tanggal] */
  const bodyLogMap: SyncState['bodyLogs'] = {}
  for (const b of bodyLogs) {
    bodyLogMap[b.date] = {
      water: b.water,
      weight: b.weight ?? null,
      sleepH: b.sleepH ?? null,
      energy: b.energy ?? null,
      soreness: b.soreness ?? null,
      stress: b.stress ?? null,
    }
  }

  /* moodLogs[tanggal] */
  const moodLogMap: SyncState['moodLogs'] = {}
  for (const m of moodLogs) {
    moodLogMap[m.date] = m.mood
  }

  const habitWires: HabitWire[] = habits.map((h) => ({
    id: h.id,
    title: h.title,
    desc: h.desc,
    cat: h.cat,
    schedule: parseSchedule(h.schedule),
    weeklyTarget: h.weeklyTarget,
    reminder: h.reminder ?? null,
    restDays: parseRestDays(h.restDays),
    afterId: h.afterId ?? null,
    mini: h.mini ?? '',
    target: h.target ?? null,
    unit: h.unit ?? null,
    groupId: h.groupId ?? null,
    linkedActivity: (h.linkedActivity as HabitWire['linkedActivity']) ?? null,
    archived: h.archived,
    createdAt: h.createdAt,
  }))

  const noteWires: NoteWire[] = notes.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    date: n.date,
    pinned: n.pinned,
    tone: n.tone,
    folder: n.folder,
  }))

  const txWires: TxWire[] = txs.map((t) => ({
    id: t.id,
    type: t.type as TxWire['type'],
    cat: t.cat,
    amount: t.amount,
    note: t.note,
    ts: t.ts,
    walletId: t.walletId ?? null,
    toWalletId: t.toWalletId ?? null,
    recurrence: (t.recurrence as TxWire['recurrence']) ?? null,
    recurOf: t.recurOf ?? null,
  }))

  const workoutWires: WorkoutWire[] = workouts.map((w) => ({
    id: w.id,
    kind: w.kind as WorkoutWire['kind'],
    date: w.date,
    duration: w.duration,
    note: w.note,
    sets: parseSets(w.sets),
    distance: w.distance ?? null,
    kcal: w.kcal ?? null,
  }))

  const customCatWires: CustomCatWire[] = customCats
    .filter((c) => !c.archived)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as CustomCatWire['type'],
    }))

  const foodWires: FoodEntryWire[] = foods.map((f) => ({
    id: f.id,
    date: f.date,
    name: f.name,
    cat: f.cat,
    unit: f.unit,
    portion: f.portion,
    meal: f.meal,
    kcal: f.kcal,
    protein: f.protein ?? null,
    carb: f.carb ?? null,
    fat: f.fat ?? null,
  }))

  const moodRaw = settingsMap.get(SYNC_SETTING_KEYS.mood)
  const deloadRaw = settingsMap.get(SYNC_SETTING_KEYS.deloadUntil)
  const quoteDateRaw = settingsMap.get(SYNC_SETTING_KEYS.quoteSavedDate)
  const catRenames = parseJsonSetting<SyncState['catRenames']>(
    settingsMap.get(SYNC_SETTING_KEYS.catRenames),
    {},
  )
  const hiddenCats = parseJsonSetting<SyncState['hiddenCats']>(
    settingsMap.get(SYNC_SETTING_KEYS.hiddenCats),
    [],
  )
  const fitTargets = parseJsonSetting<SyncState['fitTargets']>(
    settingsMap.get(SYNC_SETTING_KEYS.fitTargets),
    {
      minutes: 150,
      sessions: 3,
      water: 8,
      protein: 110,
      carb: 250,
      fat: 60,
      weightGoal: 0,
      heightCm: 0,
    },
  )

  result.initialized = true
  result.state = {
    habits: habitWires,
    completions,
    habitAuto,
    notes: noteWires,
    txs: txWires,
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      target: g.target,
      saved: g.saved,
    })),
    wallets: wallets.map((w) => ({ id: w.id, name: w.name, initial: w.initial })),
    budgets: Object.fromEntries(budgets.map((b) => [b.cat, b.amount])),
    customCats: customCatWires,
    workouts: workoutWires,
    foodEntries: foodWires,
    calorieTarget: Number(settingsMap.get(SYNC_SETTING_KEYS.calorieTarget) ?? 2000),
    bodyLogs: bodyLogMap,
    dailyGoal: Number(settingsMap.get(SYNC_SETTING_KEYS.dailyGoal) ?? 4),
    mood: moodRaw && moodRaw.length > 0 ? moodRaw : null,
    moodLogs: moodLogMap,
    identityText: settingsMap.get(SYNC_SETTING_KEYS.identityText) ?? '',
    deloadUntil: deloadRaw && deloadRaw.length > 0 ? deloadRaw : null,
    bonusClaimed: settingsMap.get(SYNC_SETTING_KEYS.bonusClaimed) === 'true',
    quoteSaved: settingsMap.get(SYNC_SETTING_KEYS.quoteSaved) === 'true',
    quoteSavedDate:
      quoteDateRaw && quoteDateRaw.length > 0 ? quoteDateRaw : null,
    /* ===== Tambahan v2.22 ===== */
    habitGroups: habitGroups.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
    })),
    catRenames,
    hiddenCats,
    fitTargets,
  }
  return result
}

/* ===== Tulis snapshot penuh (transaksi tunggal) ===== */

export interface WriteCounts {
  habits: number
  habitLogs: number
  notes: number
  wallets: number
  transactions: number
  budgets: number
  goals: number
  workouts: number
  foodEntries: number
  bodyLogs: number
  customCats: number
}

export async function writeFullState(state: SyncState): Promise<WriteCounts> {
  /* v2.18: pastikan skema backend mutakhir sebelum menulis. */
  await ensureSchema()
  /* Log hanya untuk kebiasaan yang masih ada (jaga FK habitId → habit.id).
     Nilai completions (v2.22): true = selesai penuh (value null); number
     > 0 = progres parsial kebiasaan terukur (disimpan di kolom value).
     Provenance otomatis (audit v2.37): autoBase (JSON) + autoWo (JSON
     array id workout) dari state.habitAuto. */
  const habitIds = new Set(state.habits.map((h) => h.id))
  const logRows: {
    habitId: string
    date: string
    value: number | null
    autoBase: string | null
    autoWo: string
  }[] = []
  for (const [date, day] of Object.entries(state.completions)) {
    for (const [habitId, done] of Object.entries(day)) {
      if (!habitIds.has(habitId)) continue
      const auto = state.habitAuto?.[habitId]?.[date]
      if (done === true)
        logRows.push({
          habitId,
          date,
          value: null,
          autoBase: auto?.base === undefined ? null : JSON.stringify(auto.base),
          autoWo: JSON.stringify(auto?.wo ?? []),
        })
      else if (typeof done === 'number' && done > 0)
        logRows.push({
          habitId,
          date,
          value: done,
          autoBase: auto?.base === undefined ? null : JSON.stringify(auto.base),
          autoWo: JSON.stringify(auto?.wo ?? []),
        })
    }
  }

  const bodyLogRows = Object.entries(state.bodyLogs).map(([date, b]) => ({
    date,
    water: b.water,
    weight: b.weight ?? null,
    sleepH: b.sleepH ?? null,
    energy: b.energy ?? null,
    soreness: b.soreness ?? null,
    stress: b.stress ?? null,
  }))

  const moodLogRows = Object.entries(state.moodLogs ?? {}).map(
    ([date, mood]) => ({ date, mood }),
  )

  const budgetRows = Object.entries(state.budgets).map(([cat, amount]) => ({
    cat,
    amount,
  }))

  const now = new Date().toISOString()
  const settingRows = [
    { key: SYNC_SETTING_KEYS.calorieTarget, value: String(state.calorieTarget) },
    { key: SYNC_SETTING_KEYS.dailyGoal, value: String(state.dailyGoal) },
    { key: SYNC_SETTING_KEYS.mood, value: state.mood ?? '' },
    { key: SYNC_SETTING_KEYS.identityText, value: state.identityText ?? '' },
    { key: SYNC_SETTING_KEYS.deloadUntil, value: state.deloadUntil ?? '' },
    {
      key: SYNC_SETTING_KEYS.quoteSavedDate,
      value: state.quoteSavedDate ?? '',
    },
    { key: SYNC_SETTING_KEYS.bonusClaimed, value: String(state.bonusClaimed) },
    { key: SYNC_SETTING_KEYS.quoteSaved, value: String(state.quoteSaved) },
    /* v2.22: ganti nama kategori, kategori tersembunyi, sasaran bugar. */
    {
      key: SYNC_SETTING_KEYS.catRenames,
      value: JSON.stringify(state.catRenames ?? {}),
    },
    {
      key: SYNC_SETTING_KEYS.hiddenCats,
      value: JSON.stringify(state.hiddenCats ?? []),
    },
    {
      key: SYNC_SETTING_KEYS.fitTargets,
      value: JSON.stringify(state.fitTargets),
    },
    { key: SYNC_SETTING_KEYS.initialized, value: 'true' },
    { key: SYNC_SETTING_KEYS.lastPushAt, value: now },
  ]

  /* Transaksi array: semua operasi dalam satu batch atomik — urutan
     deleteMany (log dulu, karena FK ke habit) → createMany → upsert. */
  await db.$transaction([
    db.habitLog.deleteMany(),
    db.habit.deleteMany(),
    db.habitGroup.deleteMany(),
    db.journalNote.deleteMany(),
    db.wallet.deleteMany(),
    db.transaction.deleteMany(),
    db.budget.deleteMany(),
    db.goal.deleteMany(),
    db.workoutSession.deleteMany(),
    db.foodEntry.deleteMany(),
    db.bodyLog.deleteMany(),
    db.moodLog.deleteMany(),
    db.finCategory.deleteMany(),
    ...(state.habits.length
      ? [
          db.habit.createMany({
            data: state.habits.map((h) => ({
              id: h.id,
              title: h.title,
              desc: h.desc,
              cat: h.cat,
              schedule: JSON.stringify(h.schedule),
              weeklyTarget: h.weeklyTarget,
              reminder: h.reminder,
              restDays: JSON.stringify(h.restDays ?? []),
              afterId: h.afterId ?? null,
              mini: h.mini ?? '',
              target: h.target ?? null,
              unit: h.unit ?? null,
              groupId: h.groupId ?? null,
              linkedActivity: h.linkedActivity ?? null,
              archived: h.archived,
              createdAt: h.createdAt,
            })),
          }),
        ]
      : []),
    ...(state.habitGroups?.length
      ? [
          db.habitGroup.createMany({
            data: state.habitGroups.map((g) => ({
              id: g.id,
              name: g.name,
              color: g.color,
            })),
          }),
        ]
      : []),
    ...(logRows.length ? [db.habitLog.createMany({ data: logRows })] : []),
    ...(state.notes.length
      ? [
          db.journalNote.createMany({
            data: state.notes.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              date: n.date,
              pinned: n.pinned,
              tone: n.tone,
              folder: n.folder,
            })),
          }),
        ]
      : []),
    ...(state.wallets.length
      ? [
          db.wallet.createMany({
            data: state.wallets.map((w) => ({
              id: w.id,
              name: w.name,
              initial: w.initial,
            })),
          }),
        ]
      : []),
    ...(state.txs.length
      ? [
          db.transaction.createMany({
            data: state.txs.map((t) => ({
              id: t.id,
              type: t.type,
              cat: t.cat,
              amount: t.amount,
              note: t.note,
              ts: t.ts,
              walletId: t.walletId ?? null,
              toWalletId: t.toWalletId ?? null,
              recurrence: t.recurrence ?? null,
              recurOf: t.recurOf ?? null,
            })),
          }),
        ]
      : []),
    ...(budgetRows.length ? [db.budget.createMany({ data: budgetRows })] : []),
    ...(state.customCats.length
      ? [
          db.finCategory.createMany({
            data: state.customCats.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              archived: false,
            })),
          }),
        ]
      : []),
    ...(state.goals.length
      ? [
          db.goal.createMany({
            data: state.goals.map((g) => ({
              id: g.id,
              name: g.name,
              target: g.target,
              saved: g.saved,
            })),
          }),
        ]
      : []),
    ...(state.workouts.length
      ? [
          db.workoutSession.createMany({
            data: state.workouts.map((w) => ({
              id: w.id,
              kind: w.kind,
              date: w.date,
              duration: w.duration,
              note: w.note,
              sets: JSON.stringify(w.sets),
              distance: w.distance ?? null,
              kcal: w.kcal ?? null,
            })),
          }),
        ]
      : []),
    ...(state.foodEntries.length
      ? [
          db.foodEntry.createMany({
            data: state.foodEntries.map((f) => ({
              id: f.id,
              date: f.date,
              name: f.name,
              cat: f.cat,
              unit: f.unit,
              portion: f.portion,
              meal: f.meal,
              kcal: f.kcal,
              protein: f.protein ?? null,
              carb: f.carb ?? null,
              fat: f.fat ?? null,
            })),
          }),
        ]
      : []),
    ...(bodyLogRows.length ? [db.bodyLog.createMany({ data: bodyLogRows })] : []),
    ...(moodLogRows.length
      ? [db.moodLog.createMany({ data: moodLogRows })]
      : []),
    ...settingRows.map((s) =>
      db.appSetting.upsert({
        where: { key: s.key },
        create: s,
        update: { value: s.value },
      }),
    ),
  ])

  return {
    habits: state.habits.length,
    habitLogs: logRows.length,
    notes: state.notes.length,
    wallets: state.wallets.length,
    transactions: state.txs.length,
    budgets: budgetRows.length,
    goals: state.goals.length,
    workouts: state.workouts.length,
    foodEntries: state.foodEntries.length,
    bodyLogs: bodyLogRows.length,
    customCats: state.customCats.length,
  }
}

/** Kosongkan seluruh tabel rutina_* (termasuk penanda initialized) —
 *  dipakai skrip reset, bukan endpoint publik. */
export async function resetAllData(): Promise<void> {
  await db.$transaction([
    db.habitLog.deleteMany(),
    db.habit.deleteMany(),
    db.habitGroup.deleteMany(),
    db.journalNote.deleteMany(),
    db.wallet.deleteMany(),
    db.transaction.deleteMany(),
    db.budget.deleteMany(),
    db.goal.deleteMany(),
    db.workoutSession.deleteMany(),
    db.foodEntry.deleteMany(),
    db.bodyLog.deleteMany(),
    db.moodLog.deleteMany(),
    db.finCategory.deleteMany(),
    db.appSetting.deleteMany(),
  ])
}
