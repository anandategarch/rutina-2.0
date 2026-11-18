import { z } from 'zod'
import { db } from '@/lib/db'
import { walletInputSchema } from '@/lib/sync-schema'
import { fail, guard, newId, ok, parseWith, readJson } from '@/lib/api'

/* /api/wallets — daftar & buat dompet. */

export const dynamic = 'force-dynamic'

const createSchema = walletInputSchema.extend({ id: z.string().min(1).max(64).optional() })

export async function GET() {
  return guard(async () => {
    const wallets = await db.wallet.findMany()
    return ok({ wallets })
  })
}

export async function POST(req: Request) {
  const parsed = parseWith(createSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const input = parsed.data

  return guard(async () => {
    const wallet = await db.wallet.create({
      data: {
        id: input.id ?? newId('w'),
        name: input.name,
        initial: input.initial,
      },
    })
    return ok({ wallet }, 201)
  })
}
