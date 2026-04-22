-- `movimientos_stock.motivo` NOT NULL: los triggers deben rellenarlo.

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

CREATE OR REPLACE FUNCTION public.tg_compra_item_movimiento_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_stk integer;
  new_stk integer;
  qty integer;
  c_created_at timestamptz;
  c_precio numeric;
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

  new_stk := prev_stk + qty;

  UPDATE public.productos
  SET stock_actual = new_stk
  WHERE id = NEW.producto_id;

  SELECT c.created_at
  INTO c_created_at
  FROM public.compras c
  WHERE c.id = NEW.compra_id;

  c_precio := COALESCE(NEW.precio_unitario::numeric, 0);

  INSERT INTO public.movimientos_stock (
    producto_id,
    tipo,
    motivo,
    cantidad,
    created_at,
    precio_unitario,
    compra_id,
    stock_anterior,
    stock_nuevo
  )
  VALUES (
    NEW.producto_id,
    'in',
    'compra',
    qty,
    COALESCE(c_created_at, now()),
    c_precio,
    NEW.compra_id,
    prev_stk,
    new_stk
  );

  RETURN NEW;
END;
$$;
