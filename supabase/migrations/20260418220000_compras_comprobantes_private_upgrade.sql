-- Si ya aplicaste una versión anterior con bucket público / columna comprobante_imagen_url, este script ajusta.
UPDATE storage.buckets
SET public = false, file_size_limit = 52428800
WHERE id = 'compras-comprobantes';

ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS comprobante_storage_path text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'compras'
      AND column_name = 'comprobante_imagen_url'
  ) THEN
    UPDATE public.compras
    SET comprobante_storage_path = regexp_replace(
      regexp_replace(comprobante_imagen_url, '\?.*$', ''),
      '^.*compras-comprobantes/',
      ''
    )
    WHERE comprobante_imagen_url IS NOT NULL
      AND comprobante_imagen_url <> ''
      AND comprobante_imagen_url LIKE '%compras-comprobantes%';

    UPDATE public.compras
    SET comprobante_storage_path = comprobante_imagen_url
    WHERE comprobante_imagen_url IS NOT NULL
      AND comprobante_imagen_url <> ''
      AND comprobante_storage_path IS NULL
      AND comprobante_imagen_url NOT LIKE 'http%';

    ALTER TABLE public.compras DROP COLUMN comprobante_imagen_url;
  END IF;
END $$;

COMMENT ON COLUMN public.compras.comprobante_storage_path IS 'Ruta en el bucket compras-comprobantes; acceso vía URL firmada (solo autenticados).';
