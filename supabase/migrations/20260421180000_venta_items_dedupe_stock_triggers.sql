-- Igual que en compra_items: más de un trigger AFTER INSERT en venta_items duplica
-- descuentos y deja stock_anterior / stock_nuevo incoherentes con el saldo real.
-- Un solo trigger: lee stock con FOR UPDATE, descuenta y escribe un movimiento.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.venta_items'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.venta_items', r.tgname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.tg_venta_item_movimiento_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_stk integer;
  new_stk integer;
  qty integer;
  v_created_at timestamptz;
  v_precio numeric;
BEGIN
  qty := COALESCE(NEW.cantidad, 0)::integer;
  IF qty <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.stock_actual, 0)
  INTO prev_stk
  FROM public.productos p
  WHERE p.id = NEW.producto_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'producto % no existe', NEW.producto_id;
  END IF;

  new_stk := GREATEST(prev_stk - qty, 0);

  UPDATE public.productos
  SET stock_actual = new_stk
  WHERE id = NEW.producto_id;

  SELECT v.created_at
  INTO v_created_at
  FROM public.ventas v
  WHERE v.id = NEW.venta_id;

  v_precio := COALESCE(NEW.precio_unitario::numeric, 0);

  INSERT INTO public.movimientos_stock (
    producto_id,
    tipo,
    motivo,
    cantidad,
    created_at,
    precio_unitario,
    venta_id,
    venta_item_id,
    stock_anterior,
    stock_nuevo
  )
  VALUES (
    NEW.producto_id,
    'out',
    'venta',
    qty,
    COALESCE(v_created_at, now()),
    v_precio,
    NEW.venta_id,
    NEW.id,
    prev_stk,
    new_stk
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_venta_items_movimiento_stock
  AFTER INSERT ON public.venta_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_venta_item_movimiento_stock();

-- Si `create_venta_efectivo` (u otro RPC) también descuenta `productos.stock_actual`
-- antes de insertar en `venta_items`, el trigger verá un saldo ya bajado y el
-- movimiento quedará mal. Ese descuento debe hacerlo solo este trigger.
