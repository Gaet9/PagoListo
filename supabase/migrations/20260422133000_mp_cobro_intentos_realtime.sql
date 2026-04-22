-- Permitir que el POS (usuario autenticado) observe su propio intento vía Realtime,
-- para reaccionar cuando el webhook lo consume (venta_id no nulo).

GRANT SELECT ON public.mp_cobro_intentos TO authenticated;

CREATE POLICY mp_cobro_intentos_select_own
  ON public.mp_cobro_intentos
  FOR SELECT
  TO authenticated
  USING (usuario_id = (SELECT auth.uid()));

-- Habilitar Realtime (si el proyecto lo usa). Si ya estaba, no falla.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mp_cobro_intentos;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
    WHEN undefined_object THEN
      -- supabase_realtime publication might not exist in some setups
      NULL;
  END;
END $$;

