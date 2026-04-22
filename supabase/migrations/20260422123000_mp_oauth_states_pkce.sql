-- OAuth Mercado Pago: PKCE support (code_verifier stored server-side).

ALTER TABLE public.mp_oauth_states
  ADD COLUMN IF NOT EXISTS code_verifier text;

COMMENT ON COLUMN public.mp_oauth_states.code_verifier IS 'PKCE code_verifier for Mercado Pago OAuth exchange (server-only).';

