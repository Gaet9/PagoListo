/**
 * Endpoint seguro de desvinculación MP por negocio (GAE-8, Rodrigo).
 *
 * **Blocked on Rodrigo path confirmation** (cloud agent `bc-f448bb1e`): cuando confirme el path
 * definitivo, actualizar solo esta constante. El cliente nunca toca tokens.
 *
 * Contrato esperado:
 * - `POST` con JSON `{ "negocioId": string }`
 * - `200` → `{ "ok": true }` (revoke + delete solo en servidor)
 * - errores → `{ "error": string }` (opcional `code`)
 */
export const MERCADOPAGO_OAUTH_UNLINK_API_PATH = "/api/mercadopago/oauth/unlink";
