/**
 * Endpoint seguro de desvinculación MP por negocio (GAE-8 + GAE-37 / PR #25).
 *
 * Contrato:
 * - `POST` con JSON `{ "negocioId": string }`
 * - `200` → `{ "ok": true }` (revoke + delete solo en servidor)
 * - errores → `{ "error": string }` (opcional `code`)
 */
export const MERCADOPAGO_OAUTH_UNLINK_API_PATH = "/api/mercadopago/oauth/unlink";
