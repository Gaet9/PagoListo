-- Alinea esquemas legacy (p. ej. preapproval MP) con el modelo SaaS actual.

ALTER TABLE public.suscripciones_usuario
  ADD COLUMN IF NOT EXISTS plan_code text;

ALTER TABLE public.suscripciones_usuario
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

COMMENT ON COLUMN public.suscripciones_usuario.plan_code IS
  'Plan SaaS activo (p. ej. mensual); null en filas legacy sin checkout Pro.';
