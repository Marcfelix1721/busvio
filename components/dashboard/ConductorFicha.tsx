"use client"

import { useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import {
  ArrowLeft, Phone, Mail, Pencil, Trash2, Camera, Upload, Download, Plus, X, Check,
  User, FileText, Briefcase, ClipboardList, StickyNote, Clock, Route, Gauge, CalendarDays,
} from "lucide-react"
import {
  Staff, StaffDocumento, ESTADOS, estadoInfo, iniciales, avatarColor, docEstado, antiguedad,
  DOC_TIPOS, TIPOS_CONTRATO,
} from "@/lib/staff"
import type { ServicioRealizado } from "@/app/dashboard/conductores/[id]/page"

const FONT = "'DM Sans', system-ui, sans-serif"
const NAVY = "#1e3a5f"

const inputStyle: React.CSSProperties = {
  fontFamily: FONT, height: 42, width: "100%", borderRadius: 10, border: "1px solid #e5e7eb",
  background: "#fafafa", padding: "0 14px", fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box",
}

const statusCfg: Record<string, { label: string; bg: string; text: string }> = {
  nuevo: { label: "Nuevo", bg: "#eff6ff", text: "#2563eb" },
  en_revision: { label: "En revisión", bg: "#fffbeb", text: "#b45309" },
  enviado: { label: "Enviado", bg: "#ecfeff", text: "#0e7490" },
  aceptado: { label: "Aceptado", bg: "#f0fdf4", text: "#15803d" },
  rechazado: { label: "Rechazado", bg: "#fef2f2", text: "#dc2626" },
  cancelado: { label: "Cancelado", bg: "#f3f4f6", text: "#6b7280" },
}

const TABS = [
  { key: "personales", label: "Datos personales", icon: User },
  { key: "documentacion", label: "Documentación", icon: FileText },
  { key: "contrato", label: "Contrato", icon: Briefcase },
  { key: "servicios", label: "Servicios realizados", icon: ClipboardList },
  { key: "notas", label: "Notas internas", icon: StickyNote },
] as const

type TabKey = (typeof TABS)[number]["key"]

export function ConductorFicha({ staff: initial, documentos: initialDocs, servicios, kpis, companyId }: {
  staff: Staff
  documentos: StaffDocumento[]
  servicios: ServicioRealizado[]
  kpis: { serviciosTotales: number; horasTotales: number; kmTotales: number }
  companyId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [staff, setStaff] = useState<Staff>(initial)
  const [docs, setDocs] = useState<StaffDocumento[]>(initialDocs)
  const [tab, setTab] = useState<TabKey>("personales")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const est = estadoInfo(staff.estado)

  // ---------- foto ----------
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const ext = file.name.split(".").pop()
    const path = `${companyId}/${staff.id}.${ext}`
    const { error: upErr } = await supabase.storage.from("driver-photos").upload(path, file, { upsert: true })
    if (upErr) { alert("Error al subir la foto: " + upErr.message); setUploadingPhoto(false); return }
    const { data } = supabase.storage.from("driver-photos").getPublicUrl(path)
    const url = `${data.publicUrl}?t=${Date.now()}`
    await supabase.from("staff").update({ photo_url: url }).eq("id", staff.id)
    setStaff(p => ({ ...p, photo_url: url }))
    setUploadingPhoto(false)
  }

  // ---------- eliminar conductor ----------
  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${staff.nombre}? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from("staff").delete().eq("id", staff.id)
    if (error) { alert("Error: " + error.message); return }
    router.push("/dashboard/conductores")
    router.refresh()
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 64px" }}>

        <Link href="/dashboard/conductores" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280", textDecoration: "none", marginBottom: 18 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Volver a conductores
        </Link>

        {/* HEADER */}
        <div style={{ borderRadius: 20, padding: "28px 32px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", position: "relative", overflow: "hidden" }}>
          <div aria-hidden style={{ position: "absolute", top: -100, right: -60, width: 320, height: 320, borderRadius: "50%", background: "rgba(8,145,178,0.12)", filter: "blur(70px)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            {/* foto */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              {staff.photo_url
                ? <img src={staff.photo_url} alt={staff.nombre} style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.2)" }} />
                : <div style={{ width: 96, height: 96, borderRadius: "50%", background: avatarColor(staff.nombre), display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid rgba(255,255,255,0.2)" }}>
                    <span style={{ color: "#fff", fontWeight: 800, fontSize: 34 }}>{iniciales(staff.nombre)}</span>
                  </div>}
              <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} title="Cambiar foto"
                style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: "50%", background: "#0891b2", border: "2px solid #0f172a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                <Camera style={{ width: 14, height: 14 }} />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>{staff.nombre}</h1>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: est.bg, color: est.text }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: est.dot }} /> {est.label}
                </span>
                <span style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: "rgba(255,255,255,0.12)", color: "#fff" }}>Conductor</span>
              </div>
            </div>

            {/* acciones */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <HeaderBtn href={staff.telefono ? `tel:${staff.telefono}` : undefined} icon={<Phone style={{ width: 15, height: 15 }} />} label="Llamar" />
              <HeaderBtn href={staff.email ? `mailto:${staff.email}` : undefined} icon={<Mail style={{ width: 15, height: 15 }} />} label="Email" />
              <HeaderBtn onClick={() => setTab("personales")} icon={<Pencil style={{ width: 15, height: 15 }} />} label="Editar" />
              <HeaderBtn onClick={handleDelete} icon={<Trash2 style={{ width: 15, height: 15 }} />} label="Eliminar" danger />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, margin: "20px 0 24px" }}>
          <KpiCard icon={ClipboardList} color="#1e3a5f" light="#eef2f7" label="Servicios totales" value={String(kpis.serviciosTotales)} />
          <KpiCard icon={Clock} color="#0891b2" light="#ecfeff" label="Horas conducidas" value={`${kpis.horasTotales}h`} />
          <KpiCard icon={Gauge} color="#7c3aed" light="#f5f3ff" label="Km recorridos" value={kpis.kmTotales.toLocaleString("es-ES")} />
          <KpiCard icon={CalendarDays} color="#0f766e" light="#f0fdf9" label="Antigüedad" value={antiguedad(staff.fecha_alta || staff.created_at)} />
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 22, overflowX: "auto" }}>
          {TABS.map(t => {
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: "flex", alignItems: "center", gap: 7, padding: "11px 14px", border: "none", background: "none",
                cursor: "pointer", fontFamily: FONT, fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap",
                color: active ? NAVY : "#9ca3af", borderBottom: `2px solid ${active ? NAVY : "transparent"}`, marginBottom: -1,
              }}>
                <t.icon style={{ width: 15, height: 15 }} /> {t.label}
              </button>
            )
          })}
        </div>

        {tab === "personales" && <DatosPersonales staff={staff} setStaff={setStaff} companyId={companyId} />}
        {tab === "documentacion" && <Documentacion staff={staff} docs={docs} setDocs={setDocs} companyId={companyId} />}
        {tab === "contrato" && <Contrato staff={staff} setStaff={setStaff} />}
        {tab === "servicios" && <Servicios servicios={servicios} />}
        {tab === "notas" && <Notas staff={staff} setStaff={setStaff} />}
      </div>
    </div>
  )
}

// ===================== HEADER HELPERS =====================

function HeaderBtn({ href, onClick, icon, label, danger }: { href?: string; onClick?: () => void; icon: React.ReactNode; label: string; danger?: boolean }) {
  const style: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", borderRadius: 9,
    border: "1px solid rgba(255,255,255,0.18)", background: danger ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.1)",
    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", fontFamily: FONT,
  }
  if (href) return <a href={href} style={style}>{icon} {label}</a>
  return <button onClick={onClick} style={style}>{icon} {label}</button>
}

function KpiCard({ icon: Icon, color, light, label, value }: { icon: any; color: string; light: string; label: string; value: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eef0f3", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 2px rgba(16,24,40,0.05)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: light, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Icon style={{ width: 17, height: 17, color }} />
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "5px 0 0", fontWeight: 500 }}>{label}</p>
    </div>
  )
}

function Card({ children, title, desc, action }: { children: React.ReactNode; title?: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eef0f3", borderRadius: 16, boxShadow: "0 1px 2px rgba(16,24,40,0.05)", overflow: "hidden" }}>
      {title && (
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{title}</h3>
            {desc && <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "2px 0 0" }}>{desc}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 500, color: "#6b7280" }}>{label}</label>
      {children}
    </div>
  )
}

function SaveBar({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
      <button onClick={onSave} disabled={saving} style={{
        display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 20px", borderRadius: 9, border: "none",
        background: saved ? "#10b981" : "#111827", color: "#fff", fontSize: 13.5, fontWeight: 600,
        cursor: saving ? "not-allowed" : "pointer", fontFamily: FONT, opacity: saving ? 0.7 : 1, transition: "all 0.2s",
      }}>
        {saved ? <><Check style={{ width: 15, height: 15 }} /> Guardado</> : saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  )
}

// ===================== TAB 1: DATOS PERSONALES =====================

function DatosPersonales({ staff, setStaff, companyId }: { staff: Staff; setStaff: React.Dispatch<React.SetStateAction<Staff>>; companyId: string }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    nombre: staff.nombre ?? "", email: staff.email ?? "", telefono: staff.telefono ?? "", dni: staff.dni ?? "",
    fecha_nacimiento: staff.fecha_nacimiento ?? "", direccion: staff.direccion ?? "",
    contacto_emergencia_nombre: staff.contacto_emergencia_nombre ?? "", contacto_emergencia_telefono: staff.contacto_emergencia_telefono ?? "",
    estado: staff.estado ?? "disponible",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  // Acceso a la app del conductor (reutiliza el endpoint existente)
  const [accEmail, setAccEmail] = useState(staff.email ?? "")
  const [accPass, setAccPass] = useState("")
  const [accBusy, setAccBusy] = useState(false)
  const [accError, setAccError] = useState("")
  const crearAcceso = async () => {
    if (!accEmail.trim() || accPass.length < 6) { setAccError("Email válido y contraseña de mínimo 6 caracteres"); return }
    setAccBusy(true); setAccError("")
    const res = await fetch("/api/crear-conductor", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: staff.id, email: accEmail.trim(), password: accPass, company_id: companyId }),
    })
    const data = await res.json()
    setAccBusy(false)
    if (!res.ok) { setAccError(data.error || "Error al crear el acceso"); return }
    setStaff(p => ({ ...p, user_id: data.user_id ?? "pending", email: accEmail.trim() }))
    setAccPass("")
  }

  const save = async () => {
    if (!form.nombre.trim()) { alert("El nombre es obligatorio"); return }
    setSaving(true); setSaved(false)
    const payload = {
      nombre: form.nombre.trim(), email: form.email.trim() || null, telefono: form.telefono.trim() || null,
      dni: form.dni.trim() || null, fecha_nacimiento: form.fecha_nacimiento || null, direccion: form.direccion.trim() || null,
      contacto_emergencia_nombre: form.contacto_emergencia_nombre.trim() || null,
      contacto_emergencia_telefono: form.contacto_emergencia_telefono.trim() || null,
      estado: form.estado,
    }
    const { error } = await supabase.from("staff").update(payload).eq("id", staff.id)
    setSaving(false)
    if (error) { alert("Error: " + error.message); return }
    setStaff(p => ({ ...p, ...payload }))
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Card title="Datos personales" desc="Información de contacto y datos del conductor">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Nombre completo"><input value={form.nombre} onChange={e => set("nombre", e.target.value)} style={inputStyle} /></Field>
        <Field label="Estado">
          <select value={form.estado} onChange={e => set("estado", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {ESTADOS.map(e => <option key={e} value={e}>{estadoInfo(e).label}</option>)}
          </select>
        </Field>
        <Field label="Email"><input type="email" value={form.email} onChange={e => set("email", e.target.value)} style={inputStyle} /></Field>
        <Field label="Teléfono"><input value={form.telefono} onChange={e => set("telefono", e.target.value)} style={inputStyle} /></Field>
        <Field label="DNI"><input value={form.dni} onChange={e => set("dni", e.target.value)} style={inputStyle} /></Field>
        <Field label="Fecha de nacimiento"><input type="date" value={form.fecha_nacimiento ?? ""} onChange={e => set("fecha_nacimiento", e.target.value)} style={inputStyle} /></Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Dirección"><input value={form.direccion} onChange={e => set("direccion", e.target.value)} placeholder="Calle, número, ciudad" style={inputStyle} /></Field>
        </div>
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9ca3af", margin: "26px 0 14px" }}>Contacto de emergencia</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Nombre"><input value={form.contacto_emergencia_nombre} onChange={e => set("contacto_emergencia_nombre", e.target.value)} style={inputStyle} /></Field>
        <Field label="Teléfono"><input value={form.contacto_emergencia_telefono} onChange={e => set("contacto_emergencia_telefono", e.target.value)} style={inputStyle} /></Field>
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9ca3af", margin: "26px 0 14px" }}>Acceso a la app del conductor</p>
      {staff.user_id ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "11px 14px" }}>
          <Check style={{ width: 15, height: 15, color: "#15803d" }} />
          <span style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>Acceso activo{staff.email ? ` · ${staff.email}` : ""}</span>
        </div>
      ) : (
        <div style={{ background: "#f9fafb", border: "1px solid #eef0f3", borderRadius: 10, padding: 16 }}>
          <p style={{ fontSize: 12.5, color: "#6b7280", margin: "0 0 12px" }}>Crea credenciales para que el conductor acceda a la app móvil.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <Field label="Email"><input type="email" value={accEmail} onChange={e => setAccEmail(e.target.value)} placeholder="conductor@email.com" style={inputStyle} /></Field>
            <Field label="Contraseña"><input type="password" value={accPass} onChange={e => setAccPass(e.target.value)} placeholder="Mínimo 6 caracteres" style={inputStyle} /></Field>
            <button onClick={crearAcceso} disabled={accBusy} style={{ height: 42, padding: "0 16px", borderRadius: 9, border: "none", background: "#0891b2", color: "#fff", fontSize: 13, fontWeight: 600, cursor: accBusy ? "not-allowed" : "pointer", opacity: accBusy ? 0.7 : 1, fontFamily: FONT, whiteSpace: "nowrap" }}>
              {accBusy ? "Creando..." : "Crear acceso"}
            </button>
          </div>
          {accError && <p style={{ fontSize: 12.5, color: "#dc2626", margin: "10px 0 0" }}>{accError}</p>}
        </div>
      )}

      <SaveBar onSave={save} saving={saving} saved={saved} />
    </Card>
  )
}

// ===================== TAB 2: DOCUMENTACIÓN =====================

function Documentacion({ staff, docs, setDocs, companyId }: {
  staff: Staff; docs: StaffDocumento[]; setDocs: React.Dispatch<React.SetStateAction<StaffDocumento[]>>; companyId: string
}) {
  const supabase = createClient()
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ tipo: DOC_TIPOS[0], nombre: "", fecha_emision: "", fecha_vencimiento: "", notas: "" })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setError("Selecciona un archivo"); return }
    setSaving(true); setError("")
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${companyId}/${staff.id}/${Date.now()}-${safeName}`
    const { error: upErr } = await supabase.storage.from("driver-documents").upload(path, file)
    if (upErr) { setError("Error al subir: " + upErr.message); setSaving(false); return }
    const { data, error: insErr } = await supabase.from("staff_documentos").insert({
      staff_id: staff.id, company_id: companyId, tipo: form.tipo, nombre: form.nombre.trim() || file.name,
      archivo_url: path, fecha_emision: form.fecha_emision || null, fecha_vencimiento: form.fecha_vencimiento || null,
      notas: form.notas.trim() || null,
    }).select("*").single()
    setSaving(false)
    if (insErr) { setError(insErr.message); return }
    setDocs(prev => [data as StaffDocumento, ...prev])
    setShowModal(false)
    setForm({ tipo: DOC_TIPOS[0], nombre: "", fecha_emision: "", fecha_vencimiento: "", notas: "" })
  }

  const handleDownload = async (doc: StaffDocumento) => {
    if (!doc.archivo_url) return
    const { data, error } = await supabase.storage.from("driver-documents").createSignedUrl(doc.archivo_url, 60)
    if (error || !data?.signedUrl) { alert("No se pudo abrir el documento"); return }
    window.open(data.signedUrl, "_blank")
  }

  const handleDelete = async (doc: StaffDocumento) => {
    if (!confirm("¿Eliminar este documento?")) return
    if (doc.archivo_url) await supabase.storage.from("driver-documents").remove([doc.archivo_url])
    await supabase.from("staff_documentos").delete().eq("id", doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <Card title="Documentación" desc="Carnets, certificados y otros documentos del conductor"
      action={
        <button onClick={() => { setShowModal(true); setError("") }} style={{ display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", borderRadius: 9, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
          <Plus style={{ width: 14, height: 14 }} /> Subir documento
        </button>
      }>
      {docs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <FileText style={{ width: 28, height: 28, color: "#d1d5db", margin: "0 auto 10px", display: "block" }} />
          <p style={{ fontSize: 13.5, color: "#9ca3af", margin: 0 }}>No hay documentos subidos</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map(d => {
            const ds = docEstado(d.fecha_vencimiento)
            return (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px solid #eef0f3", borderRadius: 12, background: "#fafbfc" }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText style={{ width: 17, height: 17, color: NAVY }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{d.nombre || d.tipo}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", background: "#eef0f3", padding: "1px 8px", borderRadius: 999 }}>{d.tipo}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "3px 0 0" }}>
                    {d.fecha_vencimiento ? `Vence: ${new Date(d.fecha_vencimiento).toLocaleDateString("es-ES")}` : "Sin caducidad"}
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: ds.bg, color: ds.text, whiteSpace: "nowrap" }}>{ds.label}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleDownload(d)} title="Descargar" style={iconBtn}><Download style={{ width: 14, height: 14 }} /></button>
                  <button onClick={() => handleDelete(d)} title="Eliminar" style={{ ...iconBtn, color: "#ef4444", borderColor: "#fee2e2" }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 480, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>Subir documento</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Tipo de documento">
                <select value={form.tipo} onChange={e => set("tipo", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  {DOC_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Nombre"><input value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej: Carnet C+E" style={inputStyle} /></Field>
              <Field label="Archivo (PDF o imagen)">
                <input ref={fileRef} type="file" accept="application/pdf,image/*" style={{ ...inputStyle, padding: "9px 12px", height: "auto" }} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Fecha emisión"><input type="date" value={form.fecha_emision} onChange={e => set("fecha_emision", e.target.value)} style={inputStyle} /></Field>
                <Field label="Fecha vencimiento"><input type="date" value={form.fecha_vencimiento} onChange={e => set("fecha_vencimiento", e.target.value)} style={inputStyle} /></Field>
              </div>
              <Field label="Notas"><input value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="Opcional" style={inputStyle} /></Field>
            </div>
            {error && <p style={{ fontSize: 13, color: "#dc2626", margin: "12px 0 0" }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ height: 40, padding: "0 16px", borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: FONT }}>Cancelar</button>
              <button onClick={handleUpload} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 18px", borderRadius: 9, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: FONT }}>
                <Upload style={{ width: 14, height: 14 }} /> {saving ? "Subiendo..." : "Subir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ===================== TAB 3: CONTRATO =====================

function Contrato({ staff, setStaff }: { staff: Staff; setStaff: React.Dispatch<React.SetStateAction<Staff>> }) {
  const supabase = createClient()
  const num = (v: string) => (v.trim() === "" ? null : parseFloat(v.replace(",", ".")))
  const [form, setForm] = useState({
    fecha_alta: staff.fecha_alta ?? "", tipo_contrato: staff.tipo_contrato ?? "Indefinido",
    salario: staff.salario != null ? String(staff.salario) : "", horas_max_semanales: staff.horas_max_semanales != null ? String(staff.horas_max_semanales) : "",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true); setSaved(false)
    const payload = {
      fecha_alta: form.fecha_alta || null, tipo_contrato: form.tipo_contrato,
      salario: num(form.salario), horas_max_semanales: num(form.horas_max_semanales),
    }
    const { error } = await supabase.from("staff").update(payload).eq("id", staff.id)
    setSaving(false)
    if (error) { alert("Error: " + error.message); return }
    setStaff(p => ({ ...p, ...payload }))
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Card title="Contrato" desc="Condiciones laborales del conductor">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 640 }}>
        <Field label="Fecha de alta"><input type="date" value={form.fecha_alta} onChange={e => set("fecha_alta", e.target.value)} style={inputStyle} /></Field>
        <Field label="Tipo de contrato">
          <select value={form.tipo_contrato} onChange={e => set("tipo_contrato", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Salario (€/mes)"><input type="number" value={form.salario} onChange={e => set("salario", e.target.value)} placeholder="Ej: 1800" style={inputStyle} /></Field>
        <Field label="Horas máx. semanales"><input type="number" value={form.horas_max_semanales} onChange={e => set("horas_max_semanales", e.target.value)} placeholder="Ej: 40" style={inputStyle} /></Field>
      </div>
      <SaveBar onSave={save} saving={saving} saved={saved} />
    </Card>
  )
}

// ===================== TAB 4: SERVICIOS =====================

function Servicios({ servicios }: { servicios: ServicioRealizado[] }) {
  const [mes, setMes] = useState("todos")
  const meses = useMemo(() => {
    const set = new Map<string, string>()
    for (const s of servicios) {
      if (!s.trip_date) continue
      const d = new Date(s.trip_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      set.set(key, d.toLocaleDateString("es-ES", { month: "long", year: "numeric" }))
    }
    return [...set.entries()]
  }, [servicios])

  const filtered = useMemo(() => {
    if (mes === "todos") return servicios
    return servicios.filter(s => {
      if (!s.trip_date) return false
      const d = new Date(s.trip_date)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === mes
    })
  }, [servicios, mes])

  const fmtDur = (m: number | null) => m == null ? "—" : `${Math.floor(m / 60)}h ${m % 60}m`
  const th: React.CSSProperties = { padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }
  const td: React.CSSProperties = { padding: "13px 16px", fontSize: 13, color: "#374151" }

  return (
    <Card title="Servicios realizados" desc={`${servicios.length} servicio${servicios.length !== 1 ? "s" : ""} asignado${servicios.length !== 1 ? "s" : ""}`}
      action={
        <select value={mes} onChange={e => setMes(e.target.value)} style={{ ...inputStyle, height: 38, width: "auto", cursor: "pointer", textTransform: "capitalize" }}>
          <option value="todos">Todos los meses</option>
          {meses.map(([k, label]) => <option key={k} value={k} style={{ textTransform: "capitalize" }}>{label}</option>)}
        </select>
      }>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <ClipboardList style={{ width: 28, height: 28, color: "#d1d5db", margin: "0 auto 10px", display: "block" }} />
          <p style={{ fontSize: 13.5, color: "#9ca3af", margin: 0 }}>Sin servicios en este periodo</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", margin: "-22px", marginTop: -10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f3f5" }}>
                <th style={th}>Fecha</th><th style={th}>Ruta</th><th style={th}>Cliente</th><th style={th}>Duración</th><th style={th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const cfg = statusCfg[s.status ?? ""] ?? statusCfg.nuevo
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f4f5f7" }}>
                    <td style={td}>{s.trip_date ? new Date(s.trip_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                    <td style={{ ...td, color: "#6b7280" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Route style={{ width: 13, height: 13, color: "#9ca3af" }} />
                        {s.origin && s.destination ? `${s.origin.split(",")[0]} → ${s.destination.split(",")[0]}` : "—"}
                      </span>
                    </td>
                    <td style={td}>{s.requester_name || "—"}</td>
                    <td style={{ ...td, color: "#6b7280" }}>{fmtDur(s.duracionMin)}</td>
                    <td style={td}><span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: cfg.bg, color: cfg.text }}>{cfg.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ===================== TAB 5: NOTAS =====================

function Notas({ staff, setStaff }: { staff: Staff; setStaff: React.Dispatch<React.SetStateAction<Staff>> }) {
  const supabase = createClient()
  const [value, setValue] = useState(staff.notas_internas ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true); setSaved(false)
    const { error } = await supabase.from("staff").update({ notas_internas: value || null }).eq("id", staff.id)
    setSaving(false)
    if (error) { alert("Error: " + error.message); return }
    setStaff(p => ({ ...p, notas_internas: value || null }))
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Card title="Notas internas" desc="Solo visibles para el equipo de gestión">
      <textarea value={value} onChange={e => setValue(e.target.value)} placeholder="Escribe notas privadas sobre este conductor..."
        style={{ ...inputStyle, height: 200, padding: "12px 14px", resize: "vertical", lineHeight: 1.6 }} />
      <SaveBar onSave={save} saving={saving} saved={saved} />
    </Card>
  )
}

const iconBtn: React.CSSProperties = {
  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
  border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer",
}
