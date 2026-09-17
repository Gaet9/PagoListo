/**
 * Claves de `localStorage` / `sessionStorage` de origen PagoListo ligadas a MP / OAuth / vinculación.
 *
 * Auditoría repo (2026-09-17, GAE-37 / Leo): no hay `setItem`/`getItem` en `lib/mercadopago/`,
 * componentes `mercadopago-*` ni flujos `mp_oauth` del cliente. Estado MP vía
 * `GET /api/mercadopago/oauth/status`; flash post-callback vía query `mp_oauth` (sin storage).
 * Las únicas keys `pagolisto:*` en el app son auth (`forgot-password`, `recovery-exchange`) — fuera de alcance.
 * El SDK `@mercadopago/sdk-react` (SaaS Wallet) no define keys propias en este repo.
 *
 * Al agregar persistencia MP en el navegador, registrar la key acá (no limpiar por prefijo).
 */
export const MERCADOPAGO_OAUTH_CLIENT_STORAGE_KEYS: readonly string[] = [];

export function clearMercadoPagoOAuthClientStorage(): void {
    if (typeof window === "undefined") return;
    for (const key of MERCADOPAGO_OAUTH_CLIENT_STORAGE_KEYS) {
        try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        } catch {
            /* storage bloqueado */
        }
    }
}
