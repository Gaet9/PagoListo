-- Cancelación de abono: fecha de baja; acceso hasta current_period_end (app layer).

ALTER TABLE public.suscripciones_usuario
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

COMMENT ON COLUMN public.suscripciones_usuario.canceled_at IS
  'Momento en que el usuario canceló; mantiene acceso hasta current_period_end.';
