-- Intentos de cobro Mercado Pago (no es una venta hasta que se aprueba).
-- Se crea al generar la preferencia, y el webhook (service_role) lo convierte en venta al aprobar.

CREATE TABLE public.mp_cobro_intentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES public.negocios (id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  items jsonb NOT NULL,
  mp_preference_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  venta_id uuid
);

CREATE INDEX mp_cobro_intentos_negocio_id_idx ON public.mp_cobro_intentos (negocio_id);
CREATE INDEX mp_cobro_intentos_mp_preference_id_idx ON public.mp_cobro_intentos (mp_preference_id);

COMMENT ON TABLE public.mp_cobro_intentos IS 'Intento de cobro MP asociado a un carrito; se consume al crear la venta aprobada.';

GRANT ALL ON public.mp_cobro_intentos TO service_role;
REVOKE ALL ON public.mp_cobro_intentos FROM authenticated;
REVOKE ALL ON public.mp_cobro_intentos FROM anon;

ALTER TABLE public.mp_cobro_intentos ENABLE ROW LEVEL SECURITY;
-- Sin policies: acceso solo por service_role.

-- Idempotencia extra: si llega mp_payment_id repetido, evitar doble venta.
CREATE UNIQUE INDEX IF NOT EXISTS venta_mercadopago_mp_payment_id_uniq
  ON public.venta_mercadopago (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

-- Crea una venta finalizada (metodo_pago = mercado_pago) en una sola transacción.
CREATE OR REPLACE FUNCTION public.create_venta_mercadopago_aprobada(
  p_negocio_id uuid,
  p_usuario_id uuid,
  p_items jsonb,
  p_mp_preference_id text,
  p_mp_payment_id text,
  p_payment_status text
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_venta_id uuid;
  v_exp_cnt int;
  v_priced_cnt int;
  v_total numeric;
BEGIN
  IF p_usuario_id IS NULL THEN
    RAISE EXCEPTION 'usuario_id requerido';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items must be a JSON array';
  END IF;

  WITH items AS (
    SELECT
      (value->>'producto_id')::uuid AS producto_id,
      GREATEST(((value->>'qty')::int), 0) AS qty
    FROM jsonb_array_elements(p_items)
  ),
  items_norm AS (
    SELECT producto_id, SUM(qty)::int AS qty
    FROM items
    WHERE qty > 0
    GROUP BY 1
  ),
  priced AS (
    SELECT
      p.id AS producto_id,
      i.qty,
      p.precio_venta::numeric AS precio_unitario,
      (i.qty::numeric * p.precio_venta::numeric) AS subtotal
    FROM items_norm i
    JOIN public.productos p
      ON p.id = i.producto_id
     AND p.negocio_id = p_negocio_id
  )
  SELECT
    (SELECT COUNT(*) FROM items_norm) AS exp_cnt,
    (SELECT COUNT(*) FROM priced) AS priced_cnt,
    COALESCE((SELECT SUM(subtotal) FROM priced), 0) AS total
  INTO v_exp_cnt, v_priced_cnt, v_total;

  IF v_exp_cnt IS NULL OR v_exp_cnt = 0 THEN
    RAISE EXCEPTION 'No items to charge';
  END IF;

  IF v_priced_cnt <> v_exp_cnt THEN
    RAISE EXCEPTION 'Producto inválido';
  END IF;

  -- Bloquear productos y comprobar stock (el trigger descuenta al insertar venta_items).
  PERFORM p.id
  FROM (
    SELECT producto_id, SUM(qty)::int AS qty
    FROM (
      SELECT
        (value->>'producto_id')::uuid AS producto_id,
        GREATEST(((value->>'qty')::int), 0) AS qty
      FROM jsonb_array_elements(p_items)
    ) raw
    WHERE qty > 0
    GROUP BY 1
  ) i
  JOIN public.productos p ON p.id = i.producto_id AND p.negocio_id = p_negocio_id
  FOR UPDATE OF p;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT producto_id, SUM(qty)::int AS qty
      FROM (
        SELECT
          (value->>'producto_id')::uuid AS producto_id,
          GREATEST(((value->>'qty')::int), 0) AS qty
        FROM jsonb_array_elements(p_items)
      ) raw
      WHERE qty > 0
      GROUP BY 1
    ) i
    JOIN public.productos p ON p.id = i.producto_id AND p.negocio_id = p_negocio_id
    WHERE COALESCE(p.stock_actual, 0) < i.qty
  ) THEN
    RAISE EXCEPTION 'Stock insuficiente';
  END IF;

  INSERT INTO public.ventas (negocio_id, usuario_id, total, metodo_pago, estado)
  VALUES (p_negocio_id, p_usuario_id, v_total, 'mercado_pago', 'completed')
  RETURNING id INTO v_venta_id;

  WITH items AS (
    SELECT
      (value->>'producto_id')::uuid AS producto_id,
      GREATEST(((value->>'qty')::int), 0) AS qty
    FROM jsonb_array_elements(p_items)
  ),
  items_norm AS (
    SELECT producto_id, SUM(qty)::int AS qty
    FROM items
    WHERE qty > 0
    GROUP BY 1
  )
  INSERT INTO public.venta_items (venta_id, producto_id, cantidad, precio_unitario)
  SELECT v_venta_id, p.id, i.qty, p.precio_venta::numeric
  FROM items_norm i
  JOIN public.productos p ON p.id = i.producto_id AND p.negocio_id = p_negocio_id;

  INSERT INTO public.venta_mercadopago (venta_id, mp_preference_id, mp_payment_id, payment_status)
  VALUES (v_venta_id, p_mp_preference_id, p_mp_payment_id, p_payment_status)
  ON CONFLICT (mp_preference_id) DO UPDATE
    SET mp_payment_id = EXCLUDED.mp_payment_id,
        payment_status = EXCLUDED.payment_status;

  RETURN v_venta_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_venta_mercadopago_aprobada(uuid, uuid, jsonb, text, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_venta_mercadopago_aprobada(uuid, uuid, jsonb, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_venta_mercadopago_aprobada(uuid, uuid, jsonb, text, text, text) FROM anon;

