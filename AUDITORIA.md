# Auditoría técnica — FlotaFly

> SaaS multiempresa (Next.js App Router + Supabase + Vercel) para empresas de autobús discrecional.
> Auditoría **de solo lectura**. Fecha: 2026-06-14. Ámbito: todo el repo + análisis de RLS por inspección de código (el RLS vivo de Supabase **no** está versionado y debe verificarse con las queries de §1).
> Gravedad: **crítico** (rompe hoy o fuga de datos entre empresas) · **alto** · **medio** · **bajo**.

---

## 0. RESUMEN EJECUTIVO

### Top 5 más urgentes (por gravedad)

1. **🔴 CRÍTICO — Posible fuga de datos personales entre empresas (RLS no verificable).** El esquema y la mayoría de políticas RLS se crearon a mano en Supabase y **no están en el repo**, así que no se puede garantizar que `clientes`, `staff` (salario/DNI), `vehicles`, `service_*`, `admin_sessions` estén acotadas por empresa. `sql/quote-requests-rls.sql` documenta que se leyeron 9 solicitudes con la **anon key**. → Ejecutar las queries de diagnóstico de §1 y cerrar lo que falte.
2. **🔴 CRÍTICO — `crear-conductor` sin autenticación.** Cualquiera puede crear un usuario Auth con `role:'conductor'` y `company_id` arbitrario en el JWT; como varias policies confían en `user_metadata.company_id`, esto permite **fabricar un conductor de cualquier empresa** y leer sus datos. Escalada cross-tenant.
3. **🔴 CRÍTICO (funcional) — 4 sub-páginas del dashboard rotas hoy.** `vehiculos`, `staff`, `conductores/[id]` y `clientes/[email]` siguen resolviendo la empresa con el lookup viejo a la tabla `users` (que está vacía) → rebotan a `/dashboard` o lanzan 500. La migración a `getCompanyIdServer` se quedó a medias (solo 6 de 10 páginas).
4. **🟠 ALTO — Endpoints sin auth abiertos a abuso.** `calcular-ruta` (service role + `company_id` del body → enumerar precios/márgenes ajenos y sobrescribir snapshots), las 3 rutas de email (`enviar-presupuesto`/`notificar-conductor`/`enviar-notificacion-empresa` → phishing/spam con tu cuota de Resend) y `test-impersonate` (no corta a no-admins).
5. **🟠 ALTO — Logs `[DIAG]` en producción que exponen el token del superadmin.** `crear-empresa` loggea un preview del access token en los logs de Vercel. Eran temporales ("eliminar tras diagnosticar el 403"); siguen ahí.

### Valoración honesta del estado general

FlotaFly es un **MVP funcional con buena base de producto** (motor de precios con lógica de garaje correcta en su núcleo, formulario público white-label bien resuelto, landing/login pulidos, y los fixes de hoy en RLS de configuración, onboarding y navegación de 6 páginas son sólidos). **Pero NO está endurecido para producción multiempresa.** Arrastra deuda seria en tres frentes:

- **Seguridad:** varios endpoints con service role no verifican auth, el modelo de superadmin es solo-email, y —lo más grave— **no hay garantía auditable de que el RLS aísle a las empresas** porque el esquema no está versionado. Esto es lo primero a cerrar antes de meter clientes reales.
- **Fragilidad:** la tabla `users` está vacía pero hay código que la asume (ya rompió 4 cosas hoy y quedan otras 4 páginas rotas); abundan `.single()` y `.split` sin guardas que petan con datos vacíos/nulos.
- **Consistencia:** la zona privada usa una tipografía que no se carga (cae a system-ui, distinta de la landing), componentes nativos (selects, date inputs, `alert()`, emojis) y 3 layouts distintos de dashboard.

Ninguno de estos problemas es de diseño irreparable; son deuda acumulada de iterar rápido. Con una tanda de endurecimiento de seguridad + completar la migración de `users` + versionar el esquema, el proyecto queda en estado razonable para producción.

---

## 1. SEGURIDAD

### 1.1 RLS — el esquema no está versionado (no auditable) · **CRÍTICO**

**Ubicación:** carpeta `sql/` — solo contiene `ALTER TABLE`/políticas; **ningún `CREATE TABLE`** salvo `staff_documentos`.
**Qué pasa:** las tablas (`companies`, `quote_requests`, `clientes`, `staff`, `vehicles`, `service_assignments`, `service_incidents`, `service_logs`, `admin_sessions`, `cost_variables`, `company_settings`, `pricing_settings`, `exclusion_groups`, `vehicle_cost_snapshots`, `quote_cost_overrides`, `users`) se crearon a mano en Supabase. El RLS real **no se puede auditar desde el repo**. En el repo solo hay RLS para: `quote_requests`, `companies`, `pricing_settings`, `company_settings`, `cost_variables`, `exclusion_groups`, `staff_documentos`. **No hay RLS versionado** para `clientes` (PII), `staff` (salario/DNI), `vehicles`, `service_*`, `admin_sessions`, `users`.
**Propuesta:** volcar el esquema real a `sql/schema.sql` (`pg_dump --schema-only`, revisado) y, sobre todo, **verificar el RLS vivo con estas queries** (Supabase SQL Editor):

```sql
-- (i) Tablas con RLS DESACTIVADO (máxima prioridad: cualquiera con anon key las lee/escribe)
select c.relname as tabla, c.relrowsecurity as rls_activado
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by c.relrowsecurity asc, c.relname;

-- (ii) RLS activado pero SIN ninguna policy
select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relrowsecurity=true
  and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname);

-- (iii) Policies PELIGROSAS: abiertas (qual=true) o a anon/public
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='public'
  and (qual='true' or with_check='true' or roles::text[] && array['anon','public'])
order by tablename, cmd;
-- OK esperado: quote_requests INSERT con with_check=true a anon. GRAVE: cualquier SELECT a anon/public
-- en quote_requests, clientes, staff, vehicles, service_*, admin_sessions.

-- (iv) Foco PII
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname='public'
  and tablename in ('quote_requests','clientes','staff','staff_documentos','vehicles')
order by tablename, cmd;
```
Prioridad de verificación: `clientes`, `staff`, `quote_requests`, `vehicles`, `admin_sessions`. Una sola tabla sin RLS = fuga total entre empresas.

### 1.2 `crear-conductor` sin auth → escalada cross-tenant · **CRÍTICO**

**Ubicación:** `app/api/crear-conductor/route.ts:4-7,11,28-38`
**Qué pasa:** usa `SERVICE_ROLE_KEY`, sin verificar sesión. Recibe `staff_id, email, password, company_id` del body. Permite a cualquiera `auth.admin.createUser({ email_confirm:true, user_metadata:{ role:'conductor', company_id, staff_id } })` con `company_id` arbitrario. Como `quote-requests-rls.sql:65` (y el portal del conductor) confían en `user_metadata.company_id`, se puede **fabricar un conductor de cualquier empresa** y leer sus `quote_requests`/servicios. Además el `createUser` se ejecuta **antes** del check de pertenencia de `staff` (`:17-23`), y se filtra el error crudo con `JSON.stringify(authError)` (`:42-46`).
**Propuesta:** exigir sesión del **dueño** (Bearer + `getUser`), resolver `company_id` server-side (ignorar el del body), validar `staff_id` ∈ ese `company_id` **antes** de `createUser`, y no devolver el error crudo. Crear el cliente service-role dentro del handler tras validar (no a nivel módulo).

### 1.3 `calcular-ruta` sin auth, service role, `company_id` del body · **ALTO**

**Ubicación:** `app/api/calcular-ruta/route.ts:4-7,240,244-247,267-269,298-306,310-315,449-451`
**Qué pasa:** sin sesión, con service role. Con un `company_id` ajeno (fácil de obtener) cualquiera obtiene `pricing_settings`, `cost_variables`, `exclusion_groups`, `company_settings` (**márgenes, IVA, costes, precio combustible** de la competencia) y datos de `vehicles`. Con `quote_request_id` ajeno hace `upsert` en `vehicle_cost_snapshots` (`onConflict:'quote_request_id'`) → **puede sobrescribir el snapshot de coste de un presupuesto de otra empresa**. También abusa de la cuota Geoapify.
**Propuesta:** exigir sesión, resolver `company_id` server-side (ignorar el del body), y validar que `vehicle_id`/`quote_request_id` pertenecen a esa empresa antes de leer/escribir.

### 1.4 `test-impersonate` no corta a no-admins · **ALTO**

**Ubicación:** `app/api/admin/test-impersonate/route.ts:62-64,81-92,106-113`
**Qué pasa:** si `user.email !== ADMIN_EMAIL` **no aborta** (solo añade un warning) y sigue: devuelve `id,name,email` de hasta 5 empresas, hace `INSERT`/`DELETE` en `admin_sessions`. Si el RLS de `admin_sessions`/`companies` es laxo, un autenticado cualquiera podría **crear una sesión de impersonación** y, vía `getCompanyId()`, leer otra empresa.
**Propuesta:** **eliminar este endpoint de diagnóstico**. Si se mantiene, `return 403` inmediato cuando no es admin, antes de tocar la BD.

### 1.5 Rutas de email sin auth → phishing/spam · **ALTO** (`enviar-presupuesto`, `notificar-conductor`) / **MEDIO** (`enviar-notificacion-empresa`)

**Ubicación:** `app/api/enviar-presupuesto/route.ts:8-50`, `app/api/notificar-conductor/route.ts:22,27-33`, `app/api/enviar-notificacion-empresa/route.ts:20-45`
**Qué pasa:** sin auth.
- `enviar-presupuesto`: acepta `to`, `pdfBase64` y `empresaNombre` del body → **enviar un email arbitrario con PDF adjunto arbitrario** y remitente suplantable (vector de phishing con tu cuenta de Resend). *Bonus bug funcional:* el caller `QuoteActions.tsx:137-139` envía `{quoteId, companyId}` pero la ruta espera `{to, pdfBase64,...}` → **mismatch**; el botón "enviar presupuesto" probablemente responde 400 hoy.
- `notificar-conductor`: `conductor_email` del body → emails a direcciones arbitrarias con el branding de cualquier `company_id`.
- `enviar-notificacion-empresa`: no deja elegir destinatario (va a la empresa dueña), pero permite **flood** de emails conociendo un `company_id`.
**Propuesta:** exigir sesión en las tres. En `enviar-presupuesto`, generar el PDF y resolver el destinatario en el servidor desde `quote_request_id` + empresa del usuario (no aceptar `to`/`pdfBase64` del cliente). Rate limiting en todas las rutas de email (incl. `solicitar-demo`).

### 1.6 Logs `[DIAG]` exponen preview del token de superadmin · **ALTO**

**Ubicación:** `app/api/admin/crear-empresa/route.ts:10,36-52` (loggea `tokenPreview` = primeros 8 + últimos 6 del access token y el email admin) · `app/admin/page.tsx:300-304` (consola del navegador: longitud de token + email).
**Qué pasa:** material sensible de un JWT de superadmin en los logs de Vercel. Marcados como "eliminar tras diagnosticar el 403" pero siguen.
**Propuesta:** eliminar todos los bloques `[DIAG]`. Nunca loggear tokens (ni previews) ni `JSON.stringify` de objetos de auth.

### 1.7 Validación del formulario público anon · **MEDIO**

**Ubicación:** `components/forms/QuoteForm.tsx:794-813` (validación solo cliente), `:833-849` (INSERT con anon key), `sql/quote-requests-rls.sql:46-48` (`with check (true)`).
**Qué pasa:** con la anon key directa (saltándose el cliente) se puede insertar en `quote_requests` con **`company_id` ajeno** (el `check(true)` no lo ata al slug), **spam ilimitado** (sin captcha/rate-limit; cada submit dispara además `enviar-notificacion-empresa`), y **campos sin límite de tamaño** (`comments`, `stops` JSON). Lo positivo: `status` se fija a `'nuevo'` y no se acepta `final_price`.
**Propuesta:** mover el INSERT a una ruta server-side que valide `slug→company_id`; captcha (Turnstile/hCaptcha) + rate-limit por IP; `CHECK` de longitud y de `passengers BETWEEN 1 AND 100` en la BD.

### 1.8 Modelo de superadmin solo-email + email hardcodeado · **MEDIO**

**Ubicación:** `lib/admin.ts:5` — `ADMIN_EMAIL = NEXT_PUBLIC_ADMIN_EMAIL || ADMIN_EMAIL || "betstorrente@gmail.com"`.
**Qué pasa:** si las env vars no están en Vercel, el superadmin de toda la plataforma queda fijado a un Gmail concreto. Toda la autorización admin es `user.email === ADMIN_EMAIL`; conviene garantizar que `crear-empresa`/`crear-conductor` nunca crean un usuario con ese email. `NEXT_PUBLIC_ADMIN_EMAIL` además se expone al cliente (revela quién es el admin).
**Propuesta:** quitar el fallback hardcodeado y **denegar admin si la env no está configurada**; usar solo `ADMIN_EMAIL` (no `NEXT_PUBLIC_`) en el check server-side; a medio plazo migrar a un claim `app_metadata.role='superadmin'`.

### 1.9 `stop-impersonation` no valida ADMIN_EMAIL · **BAJO**

**Ubicación:** `app/api/admin/stop-impersonation/route.ts:25-35` — hace `getUser()` pero no comprueba el email. Impacto limitado (solo borra las sesiones del propio `user.id`), pero rompe el patrón.

### Lo que está BIEN (seguridad)
- `SUPABASE_SERVICE_ROLE_KEY` confinado a rutas de servidor; **no llega al bundle del cliente** (verificado: 5 usos, todos en `app/api/.../route.ts`).
- Sin secretos hardcodeados; `.env*` en `.gitignore` y no trackeado.
- Las rutas admin "reales" (`crear-empresa`, `editar-empresa`, `quotes-overview`, `impersonate`, `get-impersonation`) **sí** validan Bearer + `getUser(token)` + `ADMIN_EMAIL`.
- El diseño de RLS de `quote_requests` (INSERT-anon / SELECT-solo-dueño-y-conductor) es correcto **si está aplicado**.

---

## 2. BUGS Y FRAGILIDAD

### 2.1 Cuatro sub-páginas rotas hoy (lookup viejo a `users`) · **CRÍTICO**

La tabla `users` está **vacía** (nada la rellena: `crear-empresa` no inserta en ella, `crear-conductor` usa `user_metadata`). Estas 4 páginas no se migraron a `getCompanyIdServer`:

| Archivo:línea | Qué pasa | Propuesta |
|---|---|---|
| `app/dashboard/vehiculos/page.tsx:25` | `users.maybeSingle()` → null → `redirect("/dashboard")`. **Rebota siempre.** | `getCompanyIdServer(supabase, user.id)` |
| `app/dashboard/staff/page.tsx:25` | Idéntico. Rebota siempre. | idem |
| `app/dashboard/conductores/[id]/page.tsx:34` | `maybeSingle()` → null → redirect. La ficha de conductor **no abre nunca**. | idem |
| `app/dashboard/clientes/[email]/page.tsx:54` | `.single()` sobre `users` vacía → **lanza error (PGRST116) → 500**. La ficha de cliente no abre. | idem (y nunca `.single()` sobre tabla que puede estar vacía) |

### 2.2 `solicitudes/[id]` no valida pertenencia de la solicitud · **ALTO**

**Ubicación:** `app/dashboard/solicitudes/[id]/page.tsx:73-77` — carga el quote por `id` y usa `quote.company_id` **sin comprobar que coincide con la empresa del usuario logueado**. Si el RLS no lo bloquea, cambiar el id en la URL deja ver/editar solicitudes de otra empresa.
**Propuesta:** resolver `companyId` con `getCompanyIdServer` y `notFound()`/redirect si `quote.company_id !== companyId` (defensa en profundidad además del RLS).

### 2.3 `.single()` que petan con 0 filas · **ALTO**

`.single()` lanza error con 0 filas (PGRST116) → 500. Riesgosos:

| Archivo:línea | Riesgo |
|---|---|
| `app/dashboard/clientes/[email]/page.tsx:54` | `users` vacía → **error garantizado hoy** (ver 2.1). |
| `app/conductor/page.tsx:30,42` | `staff`/`companies` `.single()`. Si el staff fue borrado y el JWT sigue vivo → **500 en el portal del conductor**. |
| `app/conductor/servicios/[id]/page.tsx:37,46,57,73` | 4 `.single()`. Los guards `if (!x) redirect()` **no llegan a ejecutarse** porque `.single()` lanza antes. |
| `app/api/calcular-ruta/route.ts:245,269,451` | `pricing_settings`/`vehicles` `.single()` → **500 en el cálculo** si falta la fila. |
| `app/dashboard/page.tsx:68-72` | `companies.single()` por `companyId` → 500 si el id no existe (impersonación colgada / empresa borrada). |

**Propuesta:** cambiar a `maybeSingle()` + manejar `null` explícitamente (redirect/valor por defecto/mensaje). Regla general: `.single()` solo tras un INSERT con `returning`.

### 2.4 `.split` / accesos sobre posible null → crash · **ALTO/MEDIO**

`quote_requests.origin/destination` pueden ser null; varios sitios hacen `.split` sin `?.`:

| Archivo:línea | Riesgo | Gravedad |
|---|---|---|
| `components/dashboard/CalendarioClient.tsx:130,186` | `s.origin.split(",")[0]` sin guard → **crash del calendario** si null. | **Alto** |
| `components/dashboard/CalendarioClient.tsx:154` | `s.trip_date.slice(0,7)` sin guard. | **Alto** |
| `components/conductor/ConductorDashboard.tsx:129,133` | `servicio.origin.split(',')[0]` sin guard. | **Medio** |
| `app/dashboard/solicitudes/[id]/page.tsx:320` | `item.origin.split(",")[0]` sin guard. | **Medio** |
| `components/dashboard/CalendarioClient.tsx:207` | `a.staff.nombre.split(" ")[0]` (staff/nombre null). | **Medio** |
| `components/dashboard/ConductoresManager.tsx:184` | `conductor.nombre[0].toUpperCase()` (nombre ""). | **Medio** |

**Propuesta:** optional chaining + fallback (`?.split(",")[0] ?? "—"`). *Bien:* `analytics:73` y `DashboardClient:179` ya están guardados.

### 2.5 `data.features[0]` de Geoapify sin comprobar vacío · **MEDIO**

**Ubicación:** `app/api/mapa-ruta/route.ts:9`, `components/forms/QuoteForm.tsx:566,634`. (En `app/api/calcular-ruta/route.ts:15-17,35-37` **sí** está guardado con `if (features?.length>0)` → degrada a 0 km, lo que produce silenciosamente precios bajos en rutas no geocodificables, p.ej. Tenerife→Madrid por carretera.)
**Propuesta:** comprobar `features?.length` antes de `[0]`; en el motor, distinguir "no se pudo calcular la ruta" de "0 km" y avisar.

### 2.6 Errores tragados en silencio · **ALTO/MEDIO**

| Archivo:línea | Qué pasa | Gravedad |
|---|---|---|
| `components/AddressAutocomplete.tsx:57` | `catch {}` vacío al fallar Geoapify → autocompletado deja de sugerir sin avisar (caso ya vivido). | **Alto** |
| `components/dashboard/ServiciosOperativos.tsx:294` | `.catch(()=>{})` al notificar al conductor → si el email falla, nadie se entera. | **Medio** |
| `app/api/admin/crear-empresa/route.ts:89-108` | Si fallan los INSERT de `company_settings`/`pricing_settings`, solo `console.error` → empresa creada **sin settings** (estado inconsistente silencioso). | **Medio** |
| `components/dashboard/MapaRuta.tsx:18` | `catch { setError(true) }` → el mapa desaparece sin explicación. | **Bajo** |
| Páginas server con `const { data } = await ...` sin mirar `error` | Un fallo de RLS/red se ve como "empresa sin datos" en vez de error. | **Medio** |

### 2.7 Faltan `error.tsx`/`loading.tsx` por ruta · **MEDIO**

**Ubicación:** `app/dashboard/**` no tiene `error.tsx` ni `loading.tsx`. Si una query lanza (los `.single()` de 2.3), el usuario ve el error boundary global, no un estado controlado.
**Propuesta:** añadir `app/dashboard/error.tsx` (y `loading.tsx`).

### 2.8 Validación de datos · **MEDIO/BAJO**

- **QuoteForm está bien en cliente** (fechas pasadas bloqueadas, regreso ≥ salida incl. hora mismo día, pasajeros 1-100). Pero todo es **solo cliente**: un POST manipulado mete `trip_date` pasada o `passengers` fuera de rango (no hay validación server ni `CHECK` en BD). **Medio.**
- `SettingsForm` (`NumberField`): `IVA` y `margen` **sin tope superior** → un IVA absurdo rompe los presupuestos en silencio. **Medio** — acotar 0-100.

---

## 3. MOTOR DE PRECIOS (`app/api/calcular-ruta/route.ts`)

### 3.1 La lógica del garaje es correcta en su núcleo · **OK**
`kmTotal = kmServicio + kmVacíoIda + kmVacíoVuelta`, con `kmVacíoIda = ruta(garaje→origen)` y `kmVacíoVuelta = ruta(destino→garaje)` (`:250-258`), solo si hay garaje. Conceptualmente correcto (cobra el trayecto en vacío). Margen/IVA/mínimo bien encadenados (`:457-459`): `base = subtotal·(1+margen/100)`, `IVA = base·(iva/100)`, `precio_final = max(base+IVA, mínimo)`.

### 3.2 El "precio por km" del onboarding queda HUÉRFANO · **ALTO**
**Qué pasa:** el motor lee `pricing_settings.select('garage_address, precio_combustible_global')` (`:245`) y **nunca usa `price_per_km`**. El precio "por km" sale de una `cost_variable` tipo `per_km`. El onboarding (`OnboardingWizard.savePricing`) guarda `pricing_settings.price_per_km` pero **no crea ninguna `cost_variable`**. Resultado: una empresa recién onboarded tiene **0 variables → precio 0**, aunque creyó configurar su precio/km. (Confirmado con sonda: `autocares-prueba` con 5 variables da 506,52 €; `c`/`ruben`/`david` con 0 variables dan 0 €.)
**Solución completa (fuente única de verdad = las variables):**
1. En el onboarding, al guardar precios, **sembrar** `cost_variables.insert({ company_id, nombre:'Coste por km', tipo:'per_km', valor:<price_per_km>, activa:true, orden:0 })` (solo si `>0` y si no existe ya una `per_km`).
2. `pricing_settings.price_per_km` pasa a ser informativo (o se deja de pedir).
3. **Backfill** para empresas existentes (como `c`): crear la variable a partir de su `price_per_km`, o que reconfiguren en Ajustes.

### 3.3 Servicio de ida y vuelta: posible infravaloración de km · **ALTO (verificar modelo)**
**Qué pasa:** el motor **no recibe `tripType`** (el body solo trae `return_date`/`return_time` para calcular días/horas) y `kmServicio` se calcula **una sola vez** en sentido origen→destino (`:250`). Para un servicio de **ida y vuelta** (el bus lleva al grupo y lo trae), el trayecto con pasajeros de vuelta (destino→origen) **no se cuenta** en los km → el combustible y las variables `per_km` se quedan cortos.
**Propuesta:** confirmar el modelo de negocio; si la vuelta con pasajeros debe contar, pasar `tripType` y duplicar (o recalcular) `kmServicio` para `idavuelta`.

### 3.4 La variable `percent` solo se aplica sobre el coste del vehículo · **MEDIO**
**Ubicación:** `:209` (`percent` → `subtotalPrevio·(valor/100)`) y `:353` (`const subtotalPrevio = totalVehiculo`).
**Qué pasa:** un recargo `%` (p.ej. "10% temporada alta") se calcula **solo sobre `totalVehiculo`**, ignorando el resto de variables (km, conductor, dietas…). Sin vehículo asignado, `totalVehiculo=0` → el recargo `%` es **0**. Es un footgun: el gestor cree aplicar un % al total y se aplica a una base parcial (o nula).
**Propuesta:** definir explícitamente la base del `percent` (lo natural: sobre el subtotal de costes ya acumulado, vehículo + variables previas) y documentarlo.

### 3.5 Fragilidad: `.single()` y combustible a 0 · **ALTO/MEDIO**
- `:245,269` `.single()` → 500 si falta `pricing_settings`/`vehicle` (ver 2.3).
- `precioCombustibleGlobal` por defecto 0 (`:247`) → si no se configura, **combustible = 0** sin avisar.

### 3.6 Qué debería sembrar el onboarding para calcular realista desde el día 1
Para que una empresa nueva dé un presupuesto sensato sin tocar Ajustes, el onboarding debería crear como mínimo:
- **Coste por km** (`per_km`) ← del precio que ya se pide. *(imprescindible; resuelve 3.2)*
- **Conductor** (`per_day` o `per_hour`) ← coste de personal por jornada/hora.
- **Dietas conductor** (`per_day`, condicional a umbral de horas/km) — opcional.
- **Peajes** (`fixed`/manual) — opcional, a ajustar por servicio.
Y fijar un `precio_minimo_servicio` por defecto razonable (hoy queda en 0). Con eso el motor produce un precio realista desde el primer presupuesto.

---

## 4. CONSISTENCIA Y UX

> Apoyo clave: ya existe `components/ui/` (shadcn/Radix: `select`, `input`, `button`, `card`, `badge`…) **casi sin usar**, y `DatePicker`/`TimePicker`/`PaxCounter` custom en `QuoteForm`. Adoptarlos resuelve gran parte de lo siguiente sin construir de cero.

### 4.1 Tipografía: el dashboard cae a `system-ui` · **ALTO**
**Qué pasa:** todo el dashboard/admin/onboarding/conductor declara inline `fontFamily:"'DM Sans', system-ui, sans-serif"` (~40 archivos), pero **DM Sans no se carga en ningún sitio** (`app/layout.tsx` solo importa Geist + Space Grotesk + Inter). → la zona privada usa la fuente del sistema, **distinta** de la landing/login (Space Grotesk/Inter). Además `app/globals.css:10` tiene `--font-sans: var(--font-sans)` (**referencia circular** → no resuelve).
**Propuesta:** eliminar "DM Sans" y usar `var(--font-body)` (Inter) + `var(--font-display)` (Space Grotesk) vía las clases `.font-body`/`.font-display`; arreglar el token circular de `globals.css:10`.

### 4.2 Tres layouts distintos de dashboard · **ALTO**
**Qué pasa:** no existe `app/dashboard/layout.tsx`; cada página pinta el sidebar a mano, lo que ha provocado divergencia:
- Sidebar lateral `DashboardSidebar` (correcto): la mayoría.
- **Top-bar propia** (`#111827`, 56px) sin sidebar: `staff/page.tsx:35-43`, `vehiculos/page.tsx:35-43`.
- **Top-bar sticky** sin sidebar: `solicitudes/[id]`, `conductores/[id]`.
Navegar entre ellas cambia toda la estructura, y `staff`/`vehiculos` no están en el `NAV` del sidebar (`DashboardSidebar.tsx:13-31`) — solo se llega desde Ajustes.
**Propuesta:** crear `app/dashboard/layout.tsx` que renderice `DashboardSidebar` una vez y envuelva a todos los hijos; eliminar las top-bars; añadir "Personal" y "Vehículos" al NAV.

### 4.3 Componentes nativos que rompen la marca · **ALTO/MEDIO**
| Tipo | Dónde (muestra) | Gravedad |
|---|---|---|
| `<select>` nativos (~25) | `QuoteActions:157,170`, `ServiciosOperativos:137-360`, `StaffManager`, `ConductorFicha`, `VehiculosManager`, `CostVariablesManager`, `QuoteForm:111` (público) | **Alto** |
| `type="date"` (6) | `ConductorFicha:293,436,437,484`, `ServiciosOperativos:152,153` | **Alto** |
| `alert()`/`confirm()` (~29) | **`QuoteForm:796-851` (formulario PÚBLICO, lo ve el cliente)**, `app/admin/page.tsx:288-661`, `ConductorFicha`, `VehiculosManager:109`, `StaffManager:77` | **Alto** |
| Emojis como iconos | `QuoteForm` (`📍🏁👤➡️🔴`), `[slug]:33` (`🚫`), `gracias:5` (`✅`), `app/dashboard/page.tsx:190` (`👑`), `QuoteActions`, `CostVariablesManager:12-24`, `ClienteEstado:7-11`, emails (`🚌`) | **Alto** (en superficies de cliente) |
| `type="number"` (~19) | `CostVariablesManager`, `VehiculosManager`, `OnboardingWizard`, `SettingsForm:65`, `QuoteActions:326` | **Medio** |
**Propuesta:** adoptar `components/ui/select`, extraer el `DatePicker` de QuoteForm a `components/ui/`, sustituir `type="number"` por `text`+`inputMode="numeric"` (como ya hace `PaxCounter`), reemplazar emojis por lucide-react, y `alert/confirm` por mensajes inline + modal de confirmación reutilizable.

### 4.4 Formulario público: white-label correcto · **OK** (con 2 huecos)
**Qué pasa:** `QuoteForm` SÍ se personaliza por empresa (`logo_url`, `color_primario` propagado a StepBar, botones, pickers, mapa) y **no filtra "FlotaFly" al cliente**. Bien resuelto. Huecos:
- `app/[slug]/page.tsx:22-33` (empresa desactivada) y `app/[slug]/gracias/page.tsx` salen **genéricos** (sin logo/color de la empresa) → rompe la continuidad white-label. **Medio** (la página de gracias es la última que ve el cliente).
- `notificar-conductor:35` usa `company?.name || "FlotaFly"` como fallback. **Bajo.**

### 4.5 Mezcla inline vs Tailwind + colores hardcodeados · **MEDIO**
**Qué pasa:** dos mundos (inline en zona privada; Tailwind en landing/login) y hex repetidos (`#111827`, `#0f172a`, `#1e3a5f`, `#6b7280`…) + radios dispersos (`7/8/9/12/14/16/18/20`) sin sistema, ignorando los tokens shadcn ya presentes. El cromo oscuro usa `#0f172a` (sidebar) y `#111827` (top-bars), **ninguno es el navy de marca `#1e3a5f`**.
**Propuesta:** unificar superficies oscuras en un token, centralizar paleta/radios, migrar progresivamente a `components/ui/`.

---

## 5. ARQUITECTURA Y DEUDA TÉCNICA

### 5.1 La tabla `users` no sirve para nada (pero rompe cosas) · **ALTO**
**Qué pasa:** está vacía, nada la rellena, y todo lo que la lee o rebota (§2.1) o cae a un fallback. La identidad real vive en `companies` (dueño: `companies.id == auth.uid()`), `staff` + `user_metadata` (conductores) y `admin_sessions` (impersonación).
**Plan recomendado (Opción A — eliminar dependencia):**
1. Migrar las 4 sub-páginas de §2.1 a `getCompanyIdServer`.
2. Quitar el 3er fallback a `users` de `lib/get-company-id-server.ts:38-44`.
3. Borrar `lib/get-company-id.ts` (versión cliente, **no la importa nadie**).
4. `DROP TABLE users` cuando no la lea nadie.
*(Opción B: rellenar `users` en crear-empresa/crear-conductor — solo si en el futuro hay usuarios de empresa multi-asiento que no sean conductores. Hoy no se necesita.)*

### 5.2 Esquema creado a mano fuera del repo · **ALTO** (ya cubierto en §1.1)
Ninguna tabla base tiene `CREATE TABLE` versionado (salvo `staff_documentos`). No se puede recrear la BD en otro entorno ni auditar RLS. **Versionar `sql/schema.sql`.**

### 5.3 Resolución de empresa triplicada · **MEDIO**
Conviven 3 estrategias: `getCompanyIdServer` (6 páginas), lógica inline `session.user.id`+impersonación (`dashboard/page.tsx:42-61`), y `users` a pelo (las 4 rotas). **Unificar todo en `getCompanyIdServer`**, incluida `dashboard/page.tsx`.

### 5.4 Código muerto / temporal · **MEDIO/BAJO**
| Hallazgo | Ubicación | Gravedad |
|---|---|---|
| Logs `[DIAG]` (uno loggea token) | `crear-empresa:10,36-52`, `admin/page.tsx:300-304` | **Alto** (seguridad) |
| `console.log('ASSIGNMENTS:'...)` en prod | `app/conductor/page.tsx:70` | **Bajo** |
| `lib/get-company-id.ts` sin usar | — | **Medio** |
| `lib/supabase.ts.save` (basura de editor) | — | **Bajo** |
| `app/onboarding/page.tsx` legacy (lee `users`; el onboarding real es `OnboardingWizard`) | — | **Medio** |
| `app/registro/page.tsx` solo `router.push('/')` | — | **Bajo** |
| `SideLink` declarado y no usado | `dashboard/page.tsx:272`, `clientes/[email]:221` | **Bajo** |

### 5.5 Patrones frágiles para escalar multiempresa
- Seguridad **100% dependiente de RLS no versionado** (§1.1) — el mayor riesgo al escalar.
- Clientes service-role a nivel módulo en algunas rutas (`crear-conductor:4-7`) en lugar de dentro del handler tras validar.
- Sin rate-limiting en ningún endpoint público (formulario, emails, Geoapify) → coste/DoS.

---

## Apéndice — Cómo se hizo esta auditoría
Solo lectura: inspección del código (`app/`, `components/`, `lib/`, `sql/`, `middleware.ts`), `grep` de patrones, y sondeo del endpoint público `calcular-ruta` para medir el comportamiento del motor. El **RLS vivo de Supabase no es inspeccionable desde el repo**: por eso §1 incluye queries de diagnóstico para ejecutar en el SQL Editor. No se modificó ningún archivo salvo este `AUDITORIA.md`, ni se tocó la base de datos.
