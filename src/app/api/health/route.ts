import { NextResponse } from "next/server";
import { db, isTurso } from "@/lib/db";

/** Health check — memverifikasi konektivitas database (Turso/SQLite). */
export const dynamic = "force-dynamic";

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
        message: "Kesalahan database tak terduga",
      },
      { status: 500 },
    );
  }
}
