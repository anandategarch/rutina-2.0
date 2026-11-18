import { z } from 'zod'
import { db } from '@/lib/db'
import { txInputSchema } from '@/lib/sync-schema'
import { fail, guard, newId, ok, parseWith, readJson, todayJakartaISO } from '@/lib/api'

/* /api/transactions — daftar (paginasi) & catat transaksi.
 * GET  ?limit=&offset=&type=&walletId= → { transactions, total }
 * POST → catat transaksi (id opsional; ts default hari ini Jakarta) */

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  type: z.enum(['masuk', 'keluar', 'transfer']).optional(),
  walletId: z.string().max(64).optional(),
})

const createSchema = txInputSchema.extend({ id: z.string().min(1).max(64).optional() })

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = parseWith(querySchema, {
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    type: url.searchParams.get('type') ?? undefined,
    walletId: url.searchParams.get('walletId') ?? undefined,
  })
  if (!parsed.ok) return fail('Parameter tidak valid', 422, parsed.issues)
  const q = parsed.data

  return guard(async () => {
    const where = {
      ...(q.type ? { type: q.type } : {}),
      ...(q.walletId ? { walletId: q.walletId } : {}),
    }
    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: [{ ts: 'desc' }, { id: 'desc' }],
        ...(q.limit ? { take: q.limit } : {}),
        ...(q.offset ? { skip: q.offset } : {}),
      }),
      db.transaction.count({ where }),
    ])
    return ok({ transactions, total })
  })
}

export async function POST(req: Request) {
  const parsed = parseWith(createSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const input = parsed.data

  return guard(async () => {
    const tx = await db.transaction.create({
      data: {
        id: input.id ?? newId('tx'),
        type: input.type,
        cat: input.cat,
        amount: input.amount,
        note: input.note,
        ts: input.ts ?? todayJakartaISO(),
        walletId: input.walletId ?? null,
        toWalletId: input.toWalletId ?? null,
        recurrence: input.recurrence ?? null,
        recurOf: input.recurOf ?? null,
      },
    })
    return ok({ transaction: tx }, 201)
  })
}
