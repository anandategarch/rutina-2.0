import { db } from '@/lib/db'
import { notePatchSchema } from '@/lib/sync-schema'
import { fail, guard, ok, parseWith, readJson } from '@/lib/api'

/* /api/notes/[id] — sunting (sematkan/judul/isi) & hapus catatan. */

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const parsed = parseWith(notePatchSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const patch = parsed.data

  return guard(async () => {
    const existing = await db.journalNote.findUnique({ where: { id } })
    if (!existing) return fail('Catatan tidak ditemukan', 404)

    const note = await db.journalNote.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.body !== undefined ? { body: patch.body } : {}),
        ...(patch.date !== undefined ? { date: patch.date } : {}),
        ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
        ...(patch.tone !== undefined ? { tone: patch.tone } : {}),
        ...(patch.folder !== undefined ? { folder: patch.folder } : {}),
      },
    })
    return ok({ note })
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  return guard(async () => {
    const existing = await db.journalNote.findUnique({ where: { id } })
    if (!existing) return fail('Catatan tidak ditemukan', 404)
    await db.journalNote.delete({ where: { id } })
    return ok({ deleted: id })
  })
}
