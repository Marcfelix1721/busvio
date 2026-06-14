import { NextResponse } from "next/server"

// Endpoint mínimo para verificar QUÉ commit está desplegado en producción.
// Vercel inyecta VERCEL_GIT_COMMIT_SHA en el build. Útil para confirmar deploys
// (especialmente cambios solo de /dashboard, que no alteran nada público).
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  })
}
