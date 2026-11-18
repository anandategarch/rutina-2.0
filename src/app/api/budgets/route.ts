import { db } from '@/lib/db'
import { budgetsSchema } from '@/lib/sync-schema'
import { fail, guard, ok, parseWith, readJson } from '@/lib/api'

/* /api/budgets — anggaran bulanan per kategori.
 * GET → { budgets: Record<cat, amount> }
 * PUT { budgets } → ganti seluruh anggaran (transaksi tunggal) */

export const dynamic = 'force-dynamic'

export async function GET() {
  return guard(async () => {
    const rows = await db.budget.findMany()
    return ok({ budgets: Object.fromEntries(rows.map((b) => [b.cat, b.amount])) })
  })
}

export async function PUT(req: Request) {
  const parsed = parseWith(budgetsSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const budgets = parsed.data

  return guard(async () => {
    const rows = Object.entries(budgets).map(([cat, amount]) => ({ cat, amount }))
    await db.$transaction([
      db.budget.deleteMany(),
      ...(rows.length ? [db.budget.createMany({ data: rows })] : []),
    ])
    return ok({ budgets })
  })
}
