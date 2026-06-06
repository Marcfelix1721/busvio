// Email canónico del superadmin. Único punto de verdad para todo el código.
// Se puede sobreescribir por entorno (NEXT_PUBLIC_ADMIN_EMAIL para cliente,
// ADMIN_EMAIL para servidor); si no, usa el valor por defecto.
export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "betstorrente@gmail.com"
