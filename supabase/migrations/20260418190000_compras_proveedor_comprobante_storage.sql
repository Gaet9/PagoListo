-- Datos de proveedor y comprobante (opcionales en BD; la app los exige en la pestaña Compras).
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS proveedor_nombre text,
  ADD COLUMN IF NOT EXISTS proveedor_ref text,
  ADD COLUMN IF NOT EXISTS proveedor_cuit_cuil text,
  ADD COLUMN IF NOT EXISTS comprobante_storage_path text;

COMMENT ON COLUMN public.compras.proveedor_nombre IS 'Nombre del proveedor (captura en tienda).';
COMMENT ON COLUMN public.compras.proveedor_ref IS 'Nº de factura, remito u otra referencia.';
COMMENT ON COLUMN public.compras.proveedor_cuit_cuil IS 'CUIT/CUIL del proveedor si aplica.';
COMMENT ON COLUMN public.compras.comprobante_storage_path IS 'Ruta del archivo en el bucket compras-comprobantes; acceso vía URL firmada (solo autenticados).';

-- Bucket privado; límite 50 MB (tope habitual del plan free de Supabase, no configurable en menor).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compras-comprobantes',
  'compras-comprobantes',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ruta esperada: {auth.uid()}/{negocio_id}/{uuid}.{ext}
DROP POLICY IF EXISTS "compras_comprobantes_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "compras_comprobantes_select_own" ON storage.objects;
DROP POLICY IF EXISTS "compras_comprobantes_update_own" ON storage.objects;
DROP POLICY IF EXISTS "compras_comprobantes_delete_own" ON storage.objects;

CREATE POLICY "compras_comprobantes_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'compras-comprobantes'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "compras_comprobantes_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'compras-comprobantes'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "compras_comprobantes_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'compras-comprobantes'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'compras-comprobantes'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "compras_comprobantes_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'compras-comprobantes'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
