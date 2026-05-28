import { createClient } from "@/lib/supabase"

/**
 * Obtiene el company_id del usuario actual, considerando impersonation de admin
 * Si el admin está impersonando una empresa, devuelve el company_id de esa empresa
 * Si no, devuelve el company_id del usuario autenticado
 */
export async function getCompanyId(userId: string): Promise<string | null> {
  const supabase = createClient()

  // Verificar si hay una sesión de impersonation activa
  const { data: impersonation } = await supabase
    .from("admin_sessions")
    .select("impersonated_company_id")
    .eq("admin_user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (impersonation?.impersonated_company_id) {
    // El admin está impersonando esta empresa
    return impersonation.impersonated_company_id
  }

  // No hay impersonation, obtener company_id del usuario
  // Primero intentar desde la tabla companies (el user.id ES el company_id)
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (company?.id) {
    return company.id
  }

  // Si no está en companies, intentar desde users table (por si existe)
  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle()

  return userData?.company_id || null
}
