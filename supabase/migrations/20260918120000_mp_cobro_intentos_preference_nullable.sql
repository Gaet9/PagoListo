-- Permite registrar el intento antes de crear la preferencia en MP (external_reference estable).
-- Tras create preference, se actualiza mp_preference_id.

ALTER TABLE public.mp_cobro_intentos
  ALTER COLUMN mp_preference_id DROP NOT NULL;

COMMENT ON COLUMN public.mp_cobro_intentos.mp_preference_id IS
  'ID de preferencia MP; NULL solo entre insert del intento y update post-create.';
