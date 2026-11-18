import { z } from 'zod'
import { db } from '@/lib/db'
import { fail, guard, ok, parseWith, readJson } from '@/lib/api'

/* /api/habits/[id]/toggle — tandai selesai / batalkan untuk satu tanggal.
 * POST { date } → { done: true|false } (idempoten: baris log dibuat bila
 * belum ada, dihapus bila sudah ada). */

export const dynamic = 'force-dynamic'

const toggleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'tanggal harus ISO yyyy-mm-dd'),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = parseWith(toggleSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const { date } = parsed.data

  return guard(async () => {
    const habit = await db.habit.findUnique({ where: { id } })
    if (!habit) return fail('Kebiasaan tidak ditemukan', 404)

    const existing = await db.habitLog.findUnique({
      where: { habitId_date: { habitId: id, date } },
    })
    if (existing) {
      await db.habitLog.delete({ where: { id: existing.id } })
      return ok({ habitId: id, date, done: false })
    }
    await db.habitLog.create({ data: { habitId: id, date } })
    return ok({ habitId: id, date, done: true })
  })
}
