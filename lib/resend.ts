import { Resend } from "resend"

// Remitente centralizado para todos los envíos de Resend.
// Debe usar un dominio VERIFICADO en Resend (flotafly.com) — el sandbox
// onboarding@resend.dev solo entrega al titular de la cuenta y rechaza al resto.
// Override opcional vía las variables de entorno RESEND_FROM / RESEND_FROM_ADDRESS.

// Crea el cliente de Resend de forma perezosa. Devuelve null si falta la API key,
// para que el endpoint responda un error controlado y logueado en vez de tumbar
// toda la ruta con un 500 opaco: el constructor de Resend LANZA si la key es
// undefined, y si se instancia a nivel de módulo ese throw revienta la carga de la
// ruta entera. Llamar a esto DENTRO del handler evita ese fallo global.
export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

// Dirección del remitente (dominio verificado). Se usa tal cual en avisos internos
// y como parte "<...>" cuando el nombre visible es dinámico.
export const RESEND_FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS || "notificaciones@flotafly.com"

// Remitente por defecto con marca FlotaFly (avisos internos / propios).
export const RESEND_FROM =
  process.env.RESEND_FROM || `FlotaFly <${RESEND_FROM_ADDRESS}>`

// Construye un remitente con nombre visible dinámico (nombre de la empresa de
// transporte) sobre el dominio verificado. Producto multi-tenant de marca blanca:
// el cliente final debe ver el nombre de SU empresa, no "FlotaFly".
//
// Codificación segura de la cabecera:
//  - Elimina saltos de línea (evita header injection).
//  - Elimina comillas dobles y backslash, que romperían el quoted-string.
//  - Envuelve el nombre en comillas dobles para que comas, puntos u otros
//    caracteres especiales no rompan la cabecera del remitente.
// Los acentos/UTF-8 (ej. "Autocares Giménez") los codifica Resend sin problema.
export function resendFrom(displayName?: string | null): string {
  const clean = (displayName || "")
    .replace(/[\r\n]/g, " ")
    .replace(/["\\]/g, "")
    .trim()
  if (!clean) return RESEND_FROM
  return `"${clean}" <${RESEND_FROM_ADDRESS}>`
}
