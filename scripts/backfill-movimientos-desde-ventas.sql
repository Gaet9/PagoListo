-- ---------------------------------------------------------------------------
-- À exécuter UNE FOIS dans Supabase : SQL Editor (rôle postgres / service).
-- Copie chaque ligne de public.venta_items vers public.movimientos_stock.
--
-- Si la table reste vide après :
-- 1) Vérifie le nom de la table : l'app utilise public.movimientos_stock (pluriel).
-- 2) SELECT count(*) FROM public.venta_items ;  → si 0, il n'y a rien à copier
--    (les ventes doivent avoir des lignes dans venta_items).
-- 3) Si la migration 20260417170000 avait déjà été appliquée AVANT le backfill,
--    applique plutôt la migration 20260418120000 (ou colle ce fichier).
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  n_vi bigint;
  n_ms bigint;
BEGIN
  SELECT count(*) INTO n_vi FROM public.venta_items;
  SELECT count(*) INTO n_ms FROM public.movimientos_stock;
  RAISE NOTICE '[backfill] venta_items=%, movimientos_stock=%', n_vi, n_ms;
END $$;

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
SELECT
  vi.producto_id,
  'out',
  COALESCE(vi.cantidad::integer, 0),
  v.created_at,
  COALESCE((vi.precio_unitario)::numeric, 0),
  v.id,
  vi.id,
  NULL,
  NULL
FROM public.venta_items vi
INNER JOIN public.ventas v ON v.id = vi.venta_id
INNER JOIN public.productos pr ON pr.id = vi.producto_id
WHERE COALESCE(vi.cantidad, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.movimientos_stock m
    WHERE m.venta_item_id IS NOT NULL
      AND m.venta_item_id = vi.id
  );
