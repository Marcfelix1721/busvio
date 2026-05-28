"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Building2, Plus, ExternalLink, TrendingUp, Users, FileText } from "lucide-react"
import Link from "next/link"

type Company = {
  id: string
  name: string
  slug: string
  email: string
  created_at: string
  phone?: string
  cif?: string
  address?: string
}

type Stats = {
  totalCompanies: number
  totalQuotes: number
  totalBudgets: number
}

export default function AdminPanel() {
  const supabase = createClient()
  const [companies, setCompanies] = useState<Company[]>([])
  const [stats, setStats] = useState<Stats>({ totalCompanies: 0, totalQuotes: 0, totalBudgets: 0 })
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    slug: "",
    phone: "",
    cif: "",
    address: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Cargar empresas
    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, name, slug, email, created_at, phone, cif, address")
      .order("created_at", { ascending: false })

    if (companiesData) setCompanies(companiesData)

    // Cargar estadísticas
    const { count: quotesCount } = await supabase
      .from("quote_requests")
      .select("*", { count: "exact", head: true })

    const { count: budgetsCount } = await supabase
      .from("budgets")
      .select("*", { count: "exact", head: true })

    setStats({
      totalCompanies: companiesData?.length || 0,
      totalQuotes: quotesCount || 0,
      totalBudgets: budgetsCount || 0,
    })

    setLoading(false)
  }

  async function handleCreateCompany() {
    if (!formData.name || !formData.email || !formData.password || !formData.slug) {
      alert("Rellena al menos: nombre, email, contraseña y slug")
      return
    }

    setCreating(true)

    try {
      // Obtener token del usuario actual para verificar que es admin
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch("/api/admin/crear-empresa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        alert("Error al crear empresa: " + (result.error || "Error desconocido"))
        setCreating(false)
        return
      }

      alert("Empresa creada correctamente")
      setShowCreateForm(false)
      setFormData({
        name: "",
        email: "",
        password: "",
        slug: "",
        phone: "",
        cif: "",
        address: "",
      })
      loadData()
    } catch (err) {
      console.error(err)
      alert("Error al crear empresa")
    }

    setCreating(false)
  }

  async function impersonateCompany(companyId: string) {
    try {
      // Obtener token del usuario actual
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ company_id: companyId }),
      })

      const result = await response.json()

      if (!response.ok) {
        alert("Error al acceder: " + (result.error || "Error desconocido"))
        return
      }

      // Establecer la sesión con los tokens de la empresa
      const { error } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      })

      if (error) {
        alert("Error al establecer sesión: " + error.message)
        return
      }

      // Redirigir al dashboard
      window.location.href = "/dashboard"
    } catch (err) {
      console.error(err)
      alert("Error al acceder como empresa")
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f4", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Cargando panel de administración...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f4", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "20px 32px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
              🔐 Panel de Superadmin
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
              Gestión global de FlotaFly
            </p>
          </div>
          <Link href="/dashboard" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <ExternalLink style={{ width: 14, height: 14 }} />
            Volver al dashboard
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px" }}>
        {/* Estadísticas globales */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { icon: Building2, label: "Total empresas", value: stats.totalCompanies, color: "#1e3a5f" },
            { icon: FileText, label: "Total solicitudes", value: stats.totalQuotes, color: "#0f766e" },
            { icon: TrendingUp, label: "Total presupuestos", value: stats.totalBudgets, color: "#6d28d9" },
          ].map((stat, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <stat.icon style={{ width: 18, height: 18, color: "#fff" }} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {stat.label}
                </p>
              </div>
              <p style={{ fontSize: 32, fontWeight: 700, color: "#111827", margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Empresas */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Empresas registradas</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Crear empresa
            </button>
          </div>

          {/* Formulario crear empresa */}
          {showCreateForm && (
            <div style={{ padding: "24px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Nueva empresa</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
                <input
                  placeholder="Nombre *"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  style={{ height: 38, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 12px", fontSize: 13 }}
                />
                <input
                  placeholder="Email *"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  style={{ height: 38, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 12px", fontSize: 13 }}
                />
                <input
                  placeholder="Contraseña *"
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  style={{ height: 38, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 12px", fontSize: 13 }}
                />
                <input
                  placeholder="Slug (URL) *"
                  value={formData.slug}
                  onChange={e => setFormData(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  style={{ height: 38, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 12px", fontSize: 13 }}
                />
                <input
                  placeholder="Teléfono"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  style={{ height: 38, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 12px", fontSize: 13 }}
                />
                <input
                  placeholder="CIF"
                  value={formData.cif}
                  onChange={e => setFormData(p => ({ ...p, cif: e.target.value }))}
                  style={{ height: 38, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 12px", fontSize: 13 }}
                />
                <input
                  placeholder="Dirección"
                  value={formData.address}
                  onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                  style={{ height: 38, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 12px", fontSize: 13, gridColumn: "1 / -1" }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleCreateCompany}
                  disabled={creating}
                  style={{
                    padding: "8px 16px",
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: creating ? "not-allowed" : "pointer",
                    opacity: creating ? 0.6 : 1,
                  }}
                >
                  {creating ? "Creando..." : "Crear empresa"}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#fff",
                    color: "#6b7280",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tabla de empresas */}
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Empresa</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Slug</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha registro</th>
                  <th style={{ padding: "12px 24px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(company => (
                  <tr key={company.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "16px 24px", fontSize: 14, fontWeight: 600, color: "#111827" }}>{company.name}</td>
                    <td style={{ padding: "16px 24px", fontSize: 13, color: "#6b7280" }}>/{company.slug}</td>
                    <td style={{ padding: "16px 24px", fontSize: 13, color: "#6b7280" }}>{company.email}</td>
                    <td style={{ padding: "16px 24px", fontSize: 13, color: "#6b7280" }}>
                      {new Date(company.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <button
                        onClick={() => impersonateCompany(company.id)}
                        style={{
                          padding: "6px 12px",
                          background: "#f9fafb",
                          color: "#374151",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Acceder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {companies.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#9ca3af" }}>No hay empresas registradas todavía</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
