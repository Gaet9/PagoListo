-- `create_venta_efectivo` insertaba `venta_items` (disparando el trigger que
-- descuenta stock y escribe `movimientos_stock`) y luego volvía a descontar
-- stock en un UPDATE → doble baja y snapshots incoherentes.
--
-- El descuento y el movimiento quedan solo en el trigger de `venta_items`.

CREATE OR REPLACE FUNCTION public.create_venta_efectivo(p_negocio_id uuid, p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_venta_id uuid;
  v_exp_cnt int;
  v_priced_cnt int;
  v_total numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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

  -- Bloquear productos y comprobar stock (el trigger hará el descuento al insertar venta_items).
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
  VALUES (p_negocio_id, v_user_id, v_total, 'cash', 'completed')
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

  RETURN v_venta_id;
END;
$function$;
