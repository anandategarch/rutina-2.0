import { NextResponse } from 'next/server'
import type { z } from 'zod'

/* Pembantu kecil seragam untuk seluruh route API Rutina. */

export function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status })
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, ...(details !== undefined ? { details } : {}) },
    { status },
  )
}

/** Baca JSON body dengan aman — null bila bukan JSON valid. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return null
  }
}

export function parseWith<T>(
  schema: z.ZodType<T>,
  value: unknown,
): { ok: true; data: T } | { ok: false; issues: string } {
  const res = schema.safeParse(value)
  if (res.success) return { ok: true, data: res.data }
  return {
    ok: false,
    issues: res.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; '),
  }
}

/** "Hari ini" tanggal Asia/Jakarta (zona pengguna aplikasi) — ISO yyyy-mm-dd. */
export function todayJakartaISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** ID netral untuk entitas baru lewat API. */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Pembungkus try/catch — pesan aman untuk klien, detail di log server. */
export async function guard<T>(fn: () => Promise<T>): Promise<T | ReturnType<typeof fail>> {
  try {
    return await fn()
  } catch (error) {
    console.error('[api] error:', error)
    return fail(
      error instanceof Error ? error.message : 'Kesalahan server tak terduga',
      500,
    )
  }
}
