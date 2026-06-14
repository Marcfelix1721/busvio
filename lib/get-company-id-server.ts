import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Resuelve el company_id en el SERVIDOR (Server Components) usando el cliente de
 * la sesión actual. Mismo criterio que lib/get-company-id.ts (versión cliente):
 *   1) impersonación de admin → la empresa impersonada
 *   2) el user.id ES el company_id (dueño) → companies.id = userId
 *   3) fallback: tabla users (staff/usuarios con fila propia)
 *
 * Las sub-páginas del dashboard consultaban SOLO la tabla users (que nadie
 * rellena para los dueños) y redirigían a /dashboard si no había fila, lo que
 * hacía rebotar toda la navegación. Este helper resuelve la empresa igual que
 * el home del dashboard.
 */
export async function getCompanyIdServer(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  // 1) ¿Admin impersonando?
  const { data: impersonation } = await supabase
    .from("admin_sessions")
    .select("impersonated_company_id")
    .eq("admin_user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (impersonation?.impersonated_company_id) return impersonation.impersonated_company_id

  // 2) El user.id ES el company_id (empresa dueña creada por crear-empresa)
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", userId)
    .maybeSingle()
  if (company?.id) return company.id

  // 3) Fallback: tabla users (por si el usuario es staff con fila propia)
  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle()
  return userData?.company_id ?? null
}
