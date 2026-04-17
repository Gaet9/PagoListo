-- Un nombre de producto único por negocio sin distinguir mayúsculas ni espacios al inicio/fin.
-- Si falla al aplicar, buscá duplicados con:
--   SELECT negocio_id, lower(trim(nombre)) AS k, count(*) FROM public.productos GROUP BY 1,2 HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS productos_negocio_id_nombre_lower_trim_uidx
  ON public.productos (negocio_id, (lower(trim(nombre))));
