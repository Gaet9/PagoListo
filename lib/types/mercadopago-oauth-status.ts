/** Respuesta de `GET /api/mercadopago/oauth/status` (sin tokens). */
export type MercadoPagoOAuthStatusResponse = {
  connected: boolean;
  mp_user_id?: number | null;
  account_label?: string | null;
  account_email?: string | null;
  account_nickname?: string | null;
  expires_at?: string | null;
  updated_at?: string | null;
};
