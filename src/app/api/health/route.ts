import { NextResponse } from "next/server";
import { db, isTurso } from "@/lib/db";

/** Health check — memverifikasi koneksivitas database (Turso/SQLite).
 *
 *  v2.62: ditambah `syncToken` — diagnosis konfigurasi token sinkronisasi
 *  (`configured` | `unconfigured`) tanpa membocorkan nilainya. Memudahkan
 *  verifikasi pasca-deploy: `curl /api/health` langsung menunjukkan
 *  apakah produksi sudah punya SYNC_TOKEN/NEXT_PUBLIC_SYNC_TOKEN —
 *  penyebab paling umum toast "Sinkronisasi ditolak server".
 *  (Info ini memang rahasia namun tidak sensitif: respons 401 /api/state
 *  sudah lama membocorkan status proteksi yang sama.) */
export const dynamic = "force-dynamic";

function syncTokenConfigured(): boolean {
  const primary = (process.env.SYNC_TOKEN ?? "").trim();
  const fallback = (process.env.NEXT_PUBLIC_SYNC_TOKEN ?? "").trim();
  return Boolean(primary || fallback);
}

export async function GET() {
  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      app: "rutina-2.0",
      database: {
        connected: true,
        backend: isTurso ? "turso" : "sqlite-local",
        latencyMs: Date.now() - startedAt,
      },
      syncToken: syncTokenConfigured() ? "configured" : "unconfigured",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    /* v2.16 (audit T5-b #6): pesan generik — detail DB tetap di log server. */
    console.error("[health] gagal:", error);
    return NextResponse.json(
      {
        status: "error",
        app: "rutina-2.0",
        database: { connected: false, backend: isTurso ? "turso" : "sqlite-local" },
        syncToken: syncTokenConfigured() ? "configured" : "unconfigured",
        message: "Kesalahan database tak terduga",
      },
      { status: 500 },
    );
  }
}
