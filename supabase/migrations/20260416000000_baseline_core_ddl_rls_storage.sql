-- Baseline multi-tenant core schema + RLS + storage (live project mrniaqygitqybshhfgtn, 2026-09-15).
-- Idempotent where practical for fresh clones and aligned production replay.

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

-- ---------------------------------------------------------------------------
-- Tables (core)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  email public.citext NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  apellido text,
  CONSTRAINT usuarios_id_fkey_auth FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT usuarios_role_check CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text]))
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_unique ON public.usuarios (email);

CREATE TABLE IF NOT EXISTS public.negocios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  localizacion text,
  propietario_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT negocios_propietario_id_fkey FOREIGN KEY (propietario_id) REFERENCES public.usuarios (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_negocios_propietario_id ON public.negocios (propietario_id);

CREATE TABLE IF NOT EXISTS public.negocio_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT negocio_usuarios_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES public.negocios (id) ON DELETE CASCADE,
  CONSTRAINT negocio_usuarios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
  CONSTRAINT negocio_usuarios_role_check CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'employee'::text])),
  CONSTRAINT negocio_usuarios_unique UNIQUE (negocio_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_negocio_usuarios_negocio_id ON public.negocio_usuarios (negocio_id);
CREATE INDEX IF NOT EXISTS idx_negocio_usuarios_usuario_id ON public.negocio_usuarios (usuario_id);

CREATE TABLE IF NOT EXISTS public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL,
  nombre text NOT NULL,
  barcode text,
  precio_compra numeric NOT NULL DEFAULT 0,
  precio_venta numeric NOT NULL DEFAULT 0,
  stock_actual integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT productos_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES public.negocios (id) ON DELETE CASCADE,
  CONSTRAINT productos_precio_compra_check CHECK (precio_compra >= 0::numeric),
  CONSTRAINT productos_precio_venta_check CHECK (precio_venta >= 0::numeric),
  CONSTRAINT productos_stock_actual_check CHECK (stock_actual >= 0)
);

CREATE INDEX IF NOT EXISTS idx_productos_negocio_id ON public.productos (negocio_id);

CREATE TABLE IF NOT EXISTS public.ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  metodo_pago text NOT NULL,
  estado text NOT NULL DEFAULT 'completed'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ventas_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES public.negocios (id) ON DELETE CASCADE,
  CONSTRAINT ventas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT ventas_total_check CHECK (total >= 0::numeric),
  CONSTRAINT ventas_metodo_pago_check CHECK (metodo_pago = ANY (ARRAY['cash'::text, 'mercado_pago'::text, 'transfer'::text])),
  CONSTRAINT ventas_estado_check CHECK (estado = ANY (ARRAY['completed'::text, 'cancelled'::text]))
);

CREATE INDEX IF NOT EXISTS idx_ventas_negocio_id ON public.ventas (negocio_id);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_id ON public.ventas (usuario_id);

CREATE TABLE IF NOT EXISTS public.venta_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  cantidad integer NOT NULL,
  precio_unitario numeric NOT NULL,
  subtotal numeric GENERATED ALWAYS AS (((cantidad)::numeric * precio_unitario)) STORED,
  CONSTRAINT venta_items_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas (id) ON DELETE CASCADE,
  CONSTRAINT venta_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos (id) ON DELETE RESTRICT,
  CONSTRAINT venta_items_cantidad_check CHECK (cantidad > 0),
  CONSTRAINT venta_items_precio_unitario_check CHECK (precio_unitario >= 0::numeric)
);

CREATE INDEX IF NOT EXISTS idx_venta_items_venta_id ON public.venta_items (venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_producto_id ON public.venta_items (producto_id);

CREATE TABLE IF NOT EXISTS public.compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL,
  usuario_id uuid,
  notas text NOT NULL DEFAULT ''::text,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  proveedor_nombre text,
  proveedor_ref text,
  proveedor_cuit_cuil text,
  comprobante_storage_path text,
  CONSTRAINT compras_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES public.negocios (id) ON DELETE CASCADE,
  CONSTRAINT compras_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS compras_negocio_created_idx ON public.compras (negocio_id, created_at DESC, id DESC);

COMMENT ON COLUMN public.compras.proveedor_nombre IS 'Nombre del proveedor (captura en tienda).';
COMMENT ON COLUMN public.compras.proveedor_ref IS 'Nº de factura, remito u otra referencia.';
COMMENT ON COLUMN public.compras.proveedor_cuit_cuil IS 'CUIT/CUIL del proveedor si aplica.';
COMMENT ON COLUMN public.compras.comprobante_storage_path IS 'Ruta en el bucket compras-comprobantes; acceso vía URL firmada (solo autenticados).';

CREATE TABLE IF NOT EXISTS public.compra_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  cantidad integer NOT NULL,
  precio_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  CONSTRAINT compra_items_compra_id_fkey FOREIGN KEY (compra_id) REFERENCES public.compras (id) ON DELETE CASCADE,
  CONSTRAINT compra_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos (id) ON DELETE RESTRICT,
  CONSTRAINT compra_items_cantidad_pos CHECK (cantidad > 0)
);

CREATE INDEX IF NOT EXISTS compra_items_compra_id_idx ON public.compra_items (compra_id);
CREATE INDEX IF NOT EXISTS compra_items_producto_id_idx ON public.compra_items (producto_id);

CREATE TABLE IF NOT EXISTS public.movimientos_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL,
  tipo text NOT NULL,
  cantidad integer NOT NULL,
  motivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  precio_unitario numeric,
  venta_id uuid,
  compra_id uuid,
  stock_anterior integer,
  stock_nuevo integer,
  venta_item_id uuid,
  compra_item_id uuid,
  CONSTRAINT movimientos_stock_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos (id) ON DELETE CASCADE,
  CONSTRAINT movimientos_stock_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas (id) ON DELETE SET NULL,
  CONSTRAINT movimientos_stock_compra_id_fkey FOREIGN KEY (compra_id) REFERENCES public.compras (id) ON DELETE SET NULL,
  CONSTRAINT movimientos_stock_venta_item_id_fkey FOREIGN KEY (venta_item_id) REFERENCES public.venta_items (id) ON DELETE SET NULL,
  CONSTRAINT movimientos_stock_compra_item_id_fkey FOREIGN KEY (compra_item_id) REFERENCES public.compra_items (id) ON DELETE SET NULL,
  CONSTRAINT movimientos_stock_tipo_check CHECK (tipo = ANY (ARRAY['in'::text, 'out'::text, 'ajuste'::text])),
  CONSTRAINT movimientos_stock_cantidad_check CHECK (cantidad > 0),
  CONSTRAINT movimientos_stock_motivo_check CHECK (
    char_length(TRIM(BOTH FROM motivo)) >= 1
    AND char_length(motivo) <= 200
  )
);

CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto_id ON public.movimientos_stock (producto_id);
CREATE INDEX IF NOT EXISTS movimientos_stock_producto_created_idx ON public.movimientos_stock (producto_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS movimientos_stock_venta_id_idx ON public.movimientos_stock (venta_id) WHERE (venta_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS movimientos_stock_venta_item_uidx ON public.movimientos_stock (venta_item_id) WHERE (venta_item_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS movimientos_stock_compra_item_uidx ON public.movimientos_stock (compra_item_id) WHERE (compra_item_id IS NOT NULL);

COMMENT ON COLUMN public.movimientos_stock.precio_unitario IS 'Precio unitario de referencia: compra (entrada reposición) o venta (salida venta), según motivo/tipo.';
COMMENT ON COLUMN public.movimientos_stock.venta_id IS 'ID de la venta cuando el movimiento proviene de una línea de venta.';
COMMENT ON COLUMN public.movimientos_stock.compra_id IS 'ID de compra/registro de compra si existe tabla de compras; opcional.';
COMMENT ON COLUMN public.movimientos_stock.venta_item_id IS 'Idempotencia del backfill desde venta_items.';
COMMENT ON COLUMN public.movimientos_stock.compra_item_id IS 'Idempotencia: una fila de movimiento por línea de compra.';

-- ---------------------------------------------------------------------------
-- Membership helpers + auth profile bootstrap (live definitions)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.negocio_role(p_negocio_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  select nu.role
  from public.negocio_usuarios nu
  where nu.negocio_id = p_negocio_id
    and nu.usuario_id = auth.uid()
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_negocio_member(p_negocio_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  select exists (
    select 1
    from public.negocio_usuarios nu
    where nu.negocio_id = p_negocio_id
      and nu.usuario_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_negocio_role(p_negocio_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  select public.negocio_role(p_negocio_id) = any (p_roles);
$function$;

CREATE OR REPLACE FUNCTION public.trg_negocios_create_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
begin
  insert into public.negocio_usuarios (negocio_id, usuario_id, role)
  values (new.id, new.propietario_id, 'owner')
  on conflict (negocio_id, usuario_id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.oauth_names_from_meta(p_meta jsonb, p_email text)
RETURNS TABLE(out_nombre text, out_apellido text)
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $function$
declare
  v_given text;
  v_family text;
  v_full text;
  v_nombre text;
  v_apellido text;
  v_pos int;
begin
  v_given := nullif(trim(p_meta->>'given_name'), '');
  v_family := nullif(trim(p_meta->>'family_name'), '');
  v_full := nullif(
    trim(coalesce(nullif(trim(p_meta->>'full_name'), ''), nullif(trim(p_meta->>'name'), ''))),
    ''
  );

  v_apellido := v_family;

  if v_given is not null then
    v_nombre := v_given;
    if v_apellido is null and v_full is not null and length(v_full) > length(v_given) + 1
       and lower(substring(v_full from 1 for length(v_given) + 1)) = lower(v_given) || ' '
    then
      v_apellido := trim(substring(v_full from length(v_given) + 2));
    end if;
  elsif v_full is not null then
    v_pos := position(' ' in v_full);
    if v_pos > 0 then
      v_nombre := trim(substring(v_full from 1 for v_pos - 1));
      if v_apellido is null then
        v_apellido := trim(substring(v_full from v_pos + 1));
      end if;
    else
      v_nombre := v_full;
    end if;
  else
    v_nombre := coalesce(
      nullif(split_part(coalesce(nullif(trim(p_email), ''), 'user'), '@', 1), ''),
      'Usuario'
    );
  end if;

  if v_nombre is null or trim(v_nombre) = '' then
    v_nombre := 'Usuario';
  end if;

  v_apellido := nullif(trim(v_apellido), '');

  return query select v_nombre, v_apellido;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
declare
  v_email citext;
  v_nombre text;
  v_apellido text;
begin
  v_email := lower(trim(coalesce(new.email, new.id::text || '@noemail.invalid')))::citext;

  select t.out_nombre, t.out_apellido
  into v_nombre, v_apellido
  from public.oauth_names_from_meta(new.raw_user_meta_data, coalesce(new.email, '')) as t;

  insert into public.usuarios (id, nombre, apellido, email, role)
  values (new.id, v_nombre, v_apellido, v_email, 'owner')
  on conflict (id) do nothing;

  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_negocios_owner_membership ON public.negocios;
CREATE TRIGGER trg_negocios_owner_membership
  AFTER INSERT ON public.negocios
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_negocios_create_owner_membership();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

GRANT EXECUTE ON FUNCTION public.is_negocio_member(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.negocio_role(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_negocio_role(uuid, text[]) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negocio_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;

-- usuarios
DROP POLICY IF EXISTS usuarios_insert_self ON public.usuarios;
CREATE POLICY usuarios_insert_self ON public.usuarios FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
DROP POLICY IF EXISTS usuarios_select_own ON public.usuarios;
CREATE POLICY usuarios_select_own ON public.usuarios FOR SELECT TO authenticated USING ((id = auth.uid()));
DROP POLICY IF EXISTS usuarios_update_self ON public.usuarios;
CREATE POLICY usuarios_update_self ON public.usuarios FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));

-- negocios
DROP POLICY IF EXISTS negocios_delete_owner ON public.negocios;
CREATE POLICY negocios_delete_owner ON public.negocios FOR DELETE TO authenticated USING ((propietario_id = auth.uid()));
DROP POLICY IF EXISTS negocios_insert_owner ON public.negocios;
CREATE POLICY negocios_insert_owner ON public.negocios FOR INSERT TO authenticated WITH CHECK ((propietario_id = auth.uid()));
DROP POLICY IF EXISTS negocios_select_member ON public.negocios;
CREATE POLICY negocios_select_member ON public.negocios FOR SELECT TO authenticated USING ((is_negocio_member(id) OR (propietario_id = auth.uid())));
DROP POLICY IF EXISTS negocios_update_owner ON public.negocios;
CREATE POLICY negocios_update_owner ON public.negocios FOR UPDATE TO authenticated USING ((propietario_id = auth.uid())) WITH CHECK ((propietario_id = auth.uid()));

-- negocio_usuarios
DROP POLICY IF EXISTS negocio_usuarios_delete_admin_owner ON public.negocio_usuarios;
CREATE POLICY negocio_usuarios_delete_admin_owner ON public.negocio_usuarios FOR DELETE TO authenticated USING (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text]));
DROP POLICY IF EXISTS negocio_usuarios_insert_admin_owner ON public.negocio_usuarios;
CREATE POLICY negocio_usuarios_insert_admin_owner ON public.negocio_usuarios FOR INSERT TO authenticated WITH CHECK (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text]));
DROP POLICY IF EXISTS negocio_usuarios_select_member ON public.negocio_usuarios;
CREATE POLICY negocio_usuarios_select_member ON public.negocio_usuarios FOR SELECT TO authenticated USING (is_negocio_member(negocio_id));
DROP POLICY IF EXISTS negocio_usuarios_update_admin_owner ON public.negocio_usuarios;
CREATE POLICY negocio_usuarios_update_admin_owner ON public.negocio_usuarios FOR UPDATE TO authenticated USING (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text]));

-- productos
DROP POLICY IF EXISTS productos_delete_admin_owner ON public.productos;
CREATE POLICY productos_delete_admin_owner ON public.productos FOR DELETE TO authenticated USING (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text]));
DROP POLICY IF EXISTS productos_insert_member ON public.productos;
CREATE POLICY productos_insert_member ON public.productos FOR INSERT TO authenticated WITH CHECK (is_negocio_member(negocio_id));
DROP POLICY IF EXISTS productos_select_member ON public.productos;
CREATE POLICY productos_select_member ON public.productos FOR SELECT TO authenticated USING (is_negocio_member(negocio_id));
DROP POLICY IF EXISTS productos_update_member ON public.productos;
CREATE POLICY productos_update_member ON public.productos FOR UPDATE TO authenticated USING (is_negocio_member(negocio_id)) WITH CHECK (is_negocio_member(negocio_id));

-- ventas
DROP POLICY IF EXISTS ventas_delete_admin_owner ON public.ventas;
CREATE POLICY ventas_delete_admin_owner ON public.ventas FOR DELETE TO authenticated USING (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text]));
DROP POLICY IF EXISTS ventas_insert_member ON public.ventas;
CREATE POLICY ventas_insert_member ON public.ventas FOR INSERT TO authenticated WITH CHECK ((is_negocio_member(negocio_id) AND (usuario_id = auth.uid())));
DROP POLICY IF EXISTS ventas_select_member ON public.ventas;
CREATE POLICY ventas_select_member ON public.ventas FOR SELECT TO authenticated USING (is_negocio_member(negocio_id));
DROP POLICY IF EXISTS ventas_update_admin_owner ON public.ventas;
CREATE POLICY ventas_update_admin_owner ON public.ventas FOR UPDATE TO authenticated USING (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text]));

-- venta_items
DROP POLICY IF EXISTS venta_items_delete_admin_owner ON public.venta_items;
CREATE POLICY venta_items_delete_admin_owner ON public.venta_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM ventas v
  WHERE ((v.id = venta_items.venta_id) AND has_negocio_role(v.negocio_id, ARRAY['owner'::text, 'admin'::text])))));
DROP POLICY IF EXISTS venta_items_insert_member ON public.venta_items;
CREATE POLICY venta_items_insert_member ON public.venta_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM ventas v
  WHERE ((v.id = venta_items.venta_id) AND is_negocio_member(v.negocio_id)))));
DROP POLICY IF EXISTS venta_items_select_member ON public.venta_items;
CREATE POLICY venta_items_select_member ON public.venta_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ventas v
  WHERE ((v.id = venta_items.venta_id) AND is_negocio_member(v.negocio_id)))));
DROP POLICY IF EXISTS venta_items_update_admin_owner ON public.venta_items;
CREATE POLICY venta_items_update_admin_owner ON public.venta_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM ventas v
  WHERE ((v.id = venta_items.venta_id) AND has_negocio_role(v.negocio_id, ARRAY['owner'::text, 'admin'::text]))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ventas v
  WHERE ((v.id = venta_items.venta_id) AND has_negocio_role(v.negocio_id, ARRAY['owner'::text, 'admin'::text])))));

-- compras
DROP POLICY IF EXISTS compras_delete_propietario ON public.compras;
CREATE POLICY compras_delete_propietario ON public.compras FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM negocios n
  WHERE ((n.id = compras.negocio_id) AND (n.propietario_id = auth.uid())))));
DROP POLICY IF EXISTS compras_insert_propietario ON public.compras;
CREATE POLICY compras_insert_propietario ON public.compras FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM negocios n
  WHERE ((n.id = compras.negocio_id) AND (n.propietario_id = auth.uid())))));
DROP POLICY IF EXISTS compras_select_propietario ON public.compras;
CREATE POLICY compras_select_propietario ON public.compras FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM negocios n
  WHERE ((n.id = compras.negocio_id) AND (n.propietario_id = auth.uid())))));
DROP POLICY IF EXISTS compras_update_propietario ON public.compras;
CREATE POLICY compras_update_propietario ON public.compras FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM negocios n
  WHERE ((n.id = compras.negocio_id) AND (n.propietario_id = auth.uid())))));

-- compra_items
DROP POLICY IF EXISTS compra_items_delete_propietario ON public.compra_items;
CREATE POLICY compra_items_delete_propietario ON public.compra_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (compras c
     JOIN negocios n ON ((n.id = c.negocio_id)))
  WHERE ((c.id = compra_items.compra_id) AND (n.propietario_id = auth.uid())))));
DROP POLICY IF EXISTS compra_items_insert_propietario ON public.compra_items;
CREATE POLICY compra_items_insert_propietario ON public.compra_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (compras c
     JOIN negocios n ON ((n.id = c.negocio_id)))
  WHERE ((c.id = compra_items.compra_id) AND (n.propietario_id = auth.uid())))));
DROP POLICY IF EXISTS compra_items_select_propietario ON public.compra_items;
CREATE POLICY compra_items_select_propietario ON public.compra_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (compras c
     JOIN negocios n ON ((n.id = c.negocio_id)))
  WHERE ((c.id = compra_items.compra_id) AND (n.propietario_id = auth.uid())))));
DROP POLICY IF EXISTS compra_items_update_propietario ON public.compra_items;
CREATE POLICY compra_items_update_propietario ON public.compra_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (compras c
     JOIN negocios n ON ((n.id = c.negocio_id)))
  WHERE ((c.id = compra_items.compra_id) AND (n.propietario_id = auth.uid())))));

-- movimientos_stock
DROP POLICY IF EXISTS movimientos_stock_delete_admin_owner ON public.movimientos_stock;
CREATE POLICY movimientos_stock_delete_admin_owner ON public.movimientos_stock FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM productos p
  WHERE ((p.id = movimientos_stock.producto_id) AND has_negocio_role(p.negocio_id, ARRAY['owner'::text, 'admin'::text])))));
DROP POLICY IF EXISTS movimientos_stock_delete_propietario ON public.movimientos_stock;
CREATE POLICY movimientos_stock_delete_propietario ON public.movimientos_stock FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (productos p
     JOIN negocios n ON ((n.id = p.negocio_id)))
  WHERE ((p.id = movimientos_stock.producto_id) AND (n.propietario_id = auth.uid())))));
DROP POLICY IF EXISTS movimientos_stock_insert_member ON public.movimientos_stock;
CREATE POLICY movimientos_stock_insert_member ON public.movimientos_stock FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM productos p
  WHERE ((p.id = movimientos_stock.producto_id) AND is_negocio_member(p.negocio_id)))));
DROP POLICY IF EXISTS movimientos_stock_insert_propietario ON public.movimientos_stock;
CREATE POLICY movimientos_stock_insert_propietario ON public.movimientos_stock FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (productos p
     JOIN negocios n ON ((n.id = p.negocio_id)))
  WHERE ((p.id = movimientos_stock.producto_id) AND (n.propietario_id = auth.uid())))));
DROP POLICY IF EXISTS movimientos_stock_select_member ON public.movimientos_stock;
CREATE POLICY movimientos_stock_select_member ON public.movimientos_stock FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM productos p
  WHERE ((p.id = movimientos_stock.producto_id) AND is_negocio_member(p.negocio_id)))));
DROP POLICY IF EXISTS movimientos_stock_select_propietario ON public.movimientos_stock;
CREATE POLICY movimientos_stock_select_propietario ON public.movimientos_stock FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (productos p
     JOIN negocios n ON ((n.id = p.negocio_id)))
  WHERE ((p.id = movimientos_stock.producto_id) AND (n.propietario_id = auth.uid())))));
DROP POLICY IF EXISTS movimientos_stock_update_member ON public.movimientos_stock;
CREATE POLICY movimientos_stock_update_member ON public.movimientos_stock FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM productos p
  WHERE ((p.id = movimientos_stock.producto_id) AND is_negocio_member(p.negocio_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM productos p
  WHERE ((p.id = movimientos_stock.producto_id) AND is_negocio_member(p.negocio_id)))));
DROP POLICY IF EXISTS movimientos_stock_update_propietario ON public.movimientos_stock;
CREATE POLICY movimientos_stock_update_propietario ON public.movimientos_stock FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (productos p
     JOIN negocios n ON ((n.id = p.negocio_id)))
  WHERE ((p.id = movimientos_stock.producto_id) AND (n.propietario_id = auth.uid())))));

-- ---------------------------------------------------------------------------
-- Table grants (Supabase default pattern for app-facing tables)
-- ---------------------------------------------------------------------------

GRANT ALL ON TABLE public.usuarios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.negocios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.negocio_usuarios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.productos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ventas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.venta_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.compras TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.compra_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.movimientos_stock TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage: compras-comprobantes
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compras-comprobantes',
  'compras-comprobantes',
  false,
  52428800,
  ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'application/pdf'::text]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS compras_comprobantes_delete_own ON storage.objects;
CREATE POLICY compras_comprobantes_delete_own ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'compras-comprobantes'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));
DROP POLICY IF EXISTS compras_comprobantes_insert_own ON storage.objects;
CREATE POLICY compras_comprobantes_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'compras-comprobantes'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));
DROP POLICY IF EXISTS compras_comprobantes_select_own ON storage.objects;
CREATE POLICY compras_comprobantes_select_own ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'compras-comprobantes'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));
DROP POLICY IF EXISTS compras_comprobantes_update_own ON storage.objects;
CREATE POLICY compras_comprobantes_update_own ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'compras-comprobantes'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))) WITH CHECK (((bucket_id = 'compras-comprobantes'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));
