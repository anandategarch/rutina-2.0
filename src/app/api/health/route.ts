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
    return NextResponse.json(
      {
        status: "error",
        app: "rutina-2.0",
        database: { connected: false, backend: isTurso ? "turso" : "sqlite-local" },
        message: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 },
    );
  }
}
