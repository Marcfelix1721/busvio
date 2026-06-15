import { redirect } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { SettingsForm } from "@/components/dashboard/SettingsForm"
import CostVariablesManager from "@/components/dashboard/CostVariablesManager"
import Link from "next/link"
import type { ReactNode } from "react"
import { Users, Bus, ArrowUpRight } from "lucide-react"
import { COLORS, RADIUS, SHADOW, SPACE, FONT_DISPLAY, FONT_BODY } from "@/lib/dashboard-ui"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export default async function AjustesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const companyId = await getCompanyIdServer(supabase, user.id)
  if (!companyId) redirect("/dashboard")

  const [{ data: settings }, { data: company }, { data: pricingSettings }, { data: vehiculosData }, { data: staffData }] = await Promise.all([
    supabase.from("company_settings").select("*").eq("company_id", companyId).maybeSingle(),
    supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
    supabase.from("pricing_settings").select("garage_address, parking_address").eq("company_id", companyId).maybeSingle(),
    supabase.from("vehicles").select("id").eq("company_id", companyId),
    supabase.from("staff").select("id").eq("company_id", companyId),
  ])

  const totalVehiculos = vehiculosData?.length ?? 0
  const totalStaff = staffData?.length ?? 0

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 32px 64px" }}>

          {/* HEADER */}
          <div style={{ marginBottom: SPACE.section }}>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: COLORS.navy, margin: 0, letterSpacing: "-0.025em" }}>Ajustes</h1>
            <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
              {company?.name ?? "Tu empresa"} · Configuración general
            </p>
          </div>

          {/* 1. EMPRESA + OPERACIONES + MARGEN */}
          <SettingsForm
            settings={settings}
            companyId={companyId}
            company={company}
            pricingSettings={pricingSettings}
          />

          {/* 2. VARIABLES DE COSTE */}
          <SectionWrapper
            title="Motor de costes"
            desc="Variables, condiciones y grupos de exclusión — se aplican al calcular cada presupuesto"
          >
            <CostVariablesManager companyId={companyId} />
          </SectionWrapper>

          {/* 3. RECURSOS — FLOTA Y PERSONAL */}
          <SectionWrapper
            title="Recursos"
            desc="Gestiona la flota de vehículos y el personal de la empresa"
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ResourceLink
                href="/dashboard/vehiculos"
                icon={<Bus style={{ width: 20, height: 20, color: "#fff" }} />}
                color={COLORS.navy}
                label="Flota de vehículos"
                sub={totalVehiculos === 0 ? "Sin vehículos registrados" : `${totalVehiculos} vehículo${totalVehiculos !== 1 ? "s" : ""} registrado${totalVehiculos !== 1 ? "s" : ""}`}
                cta="Gestionar flota"
              />
              <ResourceLink
                href="/dashboard/staff"
                icon={<Users style={{ width: 20, height: 20, color: "#fff" }} />}
                color={COLORS.teal}
                label="Personal"
                sub={totalStaff === 0 ? "Sin personal registrado" : `${totalStaff} persona${totalStaff !== 1 ? "s" : ""} registrada${totalStaff !== 1 ? "s" : ""}`}
                cta="Gestionar personal"
              />
            </div>
          </SectionWrapper>

    </div>
  )
}

function SectionWrapper({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: SPACE.section }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, margin: 0, fontFamily: FONT_DISPLAY }}>{title}</p>
        <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "3px 0 0", fontFamily: FONT_BODY }}>{desc}</p>
      </div>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, padding: 24 }}>
        {children}
      </div>
    </div>
  )
}

function ResourceLink({ href, icon, color, label, sub, cta }: {
  href: string; icon: ReactNode; color: string; label: string; sub: string; cta: string
}) {
  return (
    <Link href={href} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: "18px 20px", textDecoration: "none", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, margin: 0, fontFamily: FONT_BODY }}>{label}</p>
          <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "3px 0 0", fontFamily: FONT_BODY }}>{sub}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, fontFamily: FONT_BODY }}>{cta}</span>
        <ArrowUpRight style={{ width: 14, height: 14, color: COLORS.textFaint }} />
      </div>
    </Link>
  )
}