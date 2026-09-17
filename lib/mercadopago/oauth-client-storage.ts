/**
 * Claves de `localStorage` / `sessionStorage` de origen PagoListo ligadas a MP / OAuth.
 * Hoy la app no persiste tokens MP en el navegador; mantener la lista explícita al agregar keys.
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
