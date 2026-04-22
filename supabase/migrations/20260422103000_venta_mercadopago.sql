-- Cobro Mercado Pago asociado a una venta (Checkout Pro: preferencia + pago).
-- Una fila por venta (reintentos: actualizar preference_id / estado).

CREATE TABLE public.venta_mercadopago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES public.ventas (id) ON DELETE CASCADE,
  mp_preference_id text NOT NULL,
  mp_payment_id text,
  payment_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venta_mercadopago_venta_id_key UNIQUE (venta_id),
  CONSTRAINT venta_mercadopago_mp_preference_id_key UNIQUE (mp_preference_id)
);

CREATE INDEX venta_mercadopago_mp_payment_id_idx ON public.venta_mercadopago (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

COMMENT ON TABLE public.venta_mercadopago IS 'IDs Mercado Pago (preferencia / pago) ligados a ventas para Checkout Pro e IPN.';
COMMENT ON COLUMN public.venta_mercadopago.mp_preference_id IS 'ID de la preferencia devuelto por la API de MP al crear el checkout.';
COMMENT ON COLUMN public.venta_mercadopago.mp_payment_id IS 'ID del pago en MP cuando existe (p. ej. tras notificación o redirect).';
COMMENT ON COLUMN public.venta_mercadopago.payment_status IS 'Estado del pago en MP (approved, pending, rejected, etc.), si aplica.';

CREATE OR REPLACE FUNCTION public.tg_venta_mercadopago_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_venta_mercadopago_set_updated_at
  BEFORE UPDATE ON public.venta_mercadopago
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_venta_mercadopago_set_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.venta_mercadopago TO authenticated;
GRANT ALL ON public.venta_mercadopago TO service_role;

ALTER TABLE public.venta_mercadopago ENABLE ROW LEVEL SECURITY;

-- Lectura: dueño del negocio o usuario que registró la venta.
CREATE POLICY venta_mercadopago_select_authenticated
  ON public.venta_mercadopago
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ventas v
      INNER JOIN public.negocios n ON n.id = v.negocio_id
      WHERE v.id = venta_mercadopago.venta_id
        AND (n.propietario_id = (SELECT auth.uid()) OR v.usuario_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY venta_mercadopago_insert_authenticated
  ON public.venta_mercadopago
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ventas v
      INNER JOIN public.negocios n ON n.id = v.negocio_id
      WHERE v.id = venta_mercadopago.venta_id
        AND (n.propietario_id = (SELECT auth.uid()) OR v.usuario_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY venta_mercadopago_update_authenticated
  ON public.venta_mercadopago
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ventas v
      INNER JOIN public.negocios n ON n.id = v.negocio_id
      WHERE v.id = venta_mercadopago.venta_id
        AND (n.propietario_id = (SELECT auth.uid()) OR v.usuario_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ventas v
      INNER JOIN public.negocios n ON n.id = v.negocio_id
      WHERE v.id = venta_mercadopago.venta_id
        AND (n.propietario_id = (SELECT auth.uid()) OR v.usuario_id = (SELECT auth.uid()))
    )
  );
