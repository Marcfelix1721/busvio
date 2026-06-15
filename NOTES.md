# Notas técnicas y pendientes

Trabajo diagnosticado pero **no aplicado todavía**, para visibilidad del equipo. Cada
punto indica estado y enfoque. Los scripts SQL referidos se ejecutan **a mano** en el
SQL Editor de Supabase (no los corre la app).

---

## 1. Identidad del superadmin: migrar de email a `app_metadata.role`

Hoy el admin se identifica por **email** (`ADMIN_EMAIL` en `lib/admin.ts`, por defecto
`betstorrente@gmail.com`). Se migra a **role** (`app_metadata.role = 'superadmin'` en el
JWT), que no depende del email y solo lo cambia el service-role (seguro para authz, §1.8).

- **Tanda 1 (seguridad — hecha/en curso):** policy SELECT de `companies` por
  `app_metadata.role` (`sql/rls-companies-tenant-isolation.sql`) + marcar el usuario admin
  con el role (`update auth.users set raw_app_meta_data = ... || '{"role":"superadmin"}'`)
  y re-login. Cierra la fuga cross-tenant entre empresas. **El código sigue usando email.**
- **Tanda 2 (pendiente):** migrar ~10 checks `user.email === ADMIN_EMAIL` a un helper
  `isSuperadmin(user)` (= `user.app_metadata?.role === 'superadmin'`). Sitios:
  `api/admin/{quotes-overview,editar-empresa,crear-empresa,get-impersonation,impersonate,test-impersonate}`,
  `dashboard/page.tsx` (3 checks), `login/page.tsx`. NO migrar: `solicitar-demo` (usa
  ADMIN_EMAIL como destinatario del email) ni los displays del email.

> ⚠️ **No cambiar el email del admin hasta terminar la tanda 2** — si se cambia antes, el
> código (que mira el email) deja de reconocerlo aunque la policy (que mira el role) siga OK.

---

## 2. RLS del conductor usa `user_metadata.company_id` (modificable por el usuario)

Las policies del conductor filtran por `user_metadata.company_id` (p.ej. paso 3 de
`sql/rls-companies-tenant-isolation.sql` y `sql/quote-requests-rls.sql:65`). El propio
usuario puede modificar `user_metadata` (`supabase.auth.updateUser`), así que en teoría un
conductor podría cambiar su `company_id` y leer otra empresa.

- **Pendiente (pasada futura):** mover el `company_id` del conductor a `app_metadata`
  (escribirlo con service-role al crear el conductor) y cambiar las policies a
  `(auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid`. Mismo patrón seguro que el punto 1.

---

## 3. Motor de precios: coste por vehículo (opción A) + limpieza

`app/api/calcular-ruta/route.ts` **ya calcula** el coste por km desde el vehículo asignado
(combustible = consumo × precio_combustible_global, + amortización/km, + mantenimiento/km,
+ seguro/día) y guarda snapshot en `vehicle_cost_snapshots`. Decisión: **vehículo obligatorio
para calcular** (hecho — botón "Calcular" deshabilitado sin vehículo) y se eliminó la variable
fija "Coste por km" que se duplicaba.

- **Limpieza pendiente (no urgente):** el campo `precio_combustible` de la tabla `vehicles`
  está **muerto** (el motor usa el precio global de `pricing_settings`, no ese campo).
  Quitarlo (y de la clave del upsert de `vehicle_cost_snapshots`).

---

## 4. Mapa de la ficha de solicitud: no dibuja la línea de ruta

`components/dashboard/MapaRuta.tsx` es una `<img>` estática de Geoapify; muestra el área +
2 marcadores (origen/destino) pero **no la línea de ruta**, porque
`app/api/mapa-ruta/route.ts` solo **geocodifica** los puntos y no incluye el parámetro
`&geometry=` ni llama a la API de routing.

- **Pendiente (tanda propia, server-side):** en `mapa-ruta`, llamar a Geoapify Routing
  (origen→destino, `mode=drive`), obtener la geometría (polyline codificada) y añadir
  `&geometry=polyline:…;linecolor:…;linewidth:…` a la URL del static map. Esfuerzo moderado;
  cuidar la longitud de la URL. El `<img>` no cambia.
