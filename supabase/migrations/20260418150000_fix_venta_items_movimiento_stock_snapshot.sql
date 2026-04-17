-- ---------------------------------------------------------------------------
-- stock_anterior / stock_nuevo coherentes con venta_items
--
-- Problema típico: un trigger lee `productos.stock_actual` *después* de que
-- otro paso ya descontó el stock (o invierte mal la fórmula), y el movimiento
-- muestra p. ej. 101 → 100 cuando el saldo real quedó en 99.
--
-- Esta función hace en un solo bloque: FOR UPDATE del producto, lectura del
-- stock *antes* de la venta, descuento, e INSERT en movimientos_stock.
--
-- IMPORTANTE antes de aplicar en Supabase (SQL Editor o `db push`):
-- 1) Listá triggers existentes sobre `venta_items`:
--      SELECT tgname, pg_get_triggerdef(oid)
--      FROM pg_trigger
--      WHERE tgrelid = 'public.venta_items'::regclass AND NOT tgisinternal;
-- 2) Si ya hay un trigger que descuenta `productos.stock_actual` o inserta
--    en `movimientos_stock`, eliminá ese trigger (o quitá esa lógica del RPC
--    `create_venta_efectivo`) para no descontar dos veces.
-- 3) Ajustá el DROP TRIGGER de abajo si tu trigger viejo tiene otro nombre.
-- ---------------------------------------------------------------------------

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

  SELECT p.stock_actual
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

-- Quitá o ampliá esta lista según tu esquema actual.
DROP TRIGGER IF EXISTS trg_venta_items_movimiento_stock ON public.venta_items;
DROP TRIGGER IF EXISTS trg_venta_item_movimiento_stock ON public.venta_items;
DROP TRIGGER IF EXISTS on_venta_item_movimiento ON public.venta_items;

CREATE TRIGGER trg_venta_items_movimiento_stock
  AFTER INSERT ON public.venta_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_venta_item_movimiento_stock();
