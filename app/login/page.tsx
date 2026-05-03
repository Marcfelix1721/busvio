"use client"

import { FormEvent, useState } from "react"
import { BusFront } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [loginDebug, setLoginDebug] = useState("Ningún intento de login aún.")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage("")

    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    console.log('Login result:', { error, data })

    const debugJson = JSON.stringify(
      { error, data },
      (_key, value) => {
        if (value instanceof Error) {
          return {
            message: value.message,
            name: value.name,
            ...("status" in value && typeof (value as { status?: number }).status === "number"
              ? { status: (value as { status: number }).status }
              : {}),
          }
        }
        if (value && typeof value === "object" && "access_token" in value) {
          const session = value as Record<string, unknown>
          return {
            ...session,
            access_token: session.access_token ? "[redacted]" : session.access_token,
            refresh_token: session.refresh_token ? "[redacted]" : session.refresh_token,
          }
        }
        return value
      },
      2
    )
    setLoginDebug(debugJson)

    setLoading(false)

    if (error) {
      setErrorMessage("Email o contraseña incorrectos")
      return
    }

    window.location.href = "/dashboard"
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-r from-[#f3f5f8] to-[#eef2f7] px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-[#1e3a5f] shadow-md">
            <BusFront className="size-8 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">Busvio</h1>
          <p className="mt-2 text-lg font-medium text-slate-500">Gestión de presupuestos</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <h2 className="text-4xl font-bold text-slate-900">Bienvenido</h2>
          <p className="mt-2 text-2xl text-slate-500">Inicia sesión en tu cuenta</p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-[1.1rem] font-semibold text-slate-800">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 rounded-xl border-slate-300 bg-white px-4 text-lg"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="password"
                className="text-[1.1rem] font-semibold text-slate-800"
              >
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 rounded-xl border-slate-300 bg-white px-4 text-lg"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="mt-4 h-12 w-full rounded-xl bg-[#1e3a5f] text-xl font-semibold text-white hover:bg-[#1e3a5f]/90"
            >
              {loading ? "Entrando..." : "Iniciar sesión"}
            </Button>
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
                Debug (resultado del login)
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-amber-950">
                {loginDebug}
              </pre>
            </div>
          </form>

          <p className="mt-8 text-center text-[1rem] font-medium text-slate-500">
            ¿Problemas para acceder? Contacta con soporte.
          </p>
        </div>
      </div>
    </main>
  )
}
