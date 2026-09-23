-- GAE-17 STEP C: RLS roles manager vs employee (compras member access, productos write admin/owner).

-- ---------------------------------------------------------------------------
-- Paywall: empleados heredan abono activo del propietario del negocio (SECURITY DEFINER).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_active_subscription_via_negocio_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.negocio_usuarios nu
    JOIN public.negocios n ON n.id = nu.negocio_id
    JOIN public.suscripciones_usuario su ON su.user_id = n.propietario_id
    WHERE nu.usuario_id = auth.uid()
      AND su.status = ANY (ARRAY['active'::text, 'canceled'::text])
      AND su.current_period_end IS NOT NULL
      AND su.current_period_end > now()
  );
$function$;

COMMENT ON FUNCTION public.has_active_subscription_via_negocio_owner() IS
  'GAE-17: true si algún negocio del usuario tiene propietario con abono SaaS vigente.';

GRANT EXECUTE ON FUNCTION public.has_active_subscription_via_negocio_owner() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- compras: cualquier miembro del negocio (incluye employee)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS compras_delete_propietario ON public.compras;
DROP POLICY IF EXISTS compras_insert_propietario ON public.compras;
DROP POLICY IF EXISTS compras_select_propietario ON public.compras;
DROP POLICY IF EXISTS compras_update_propietario ON public.compras;

DROP POLICY IF EXISTS compras_delete_member ON public.compras;
CREATE POLICY compras_delete_member ON public.compras
  FOR DELETE TO authenticated
  USING (is_negocio_member(negocio_id));

DROP POLICY IF EXISTS compras_insert_member ON public.compras;
CREATE POLICY compras_insert_member ON public.compras
  FOR INSERT TO authenticated
  WITH CHECK (is_negocio_member(negocio_id));

DROP POLICY IF EXISTS compras_select_member ON public.compras;
CREATE POLICY compras_select_member ON public.compras
  FOR SELECT TO authenticated
  USING (is_negocio_member(negocio_id));

DROP POLICY IF EXISTS compras_update_member ON public.compras;
CREATE POLICY compras_update_member ON public.compras
  FOR UPDATE TO authenticated
  USING (is_negocio_member(negocio_id))
  WITH CHECK (is_negocio_member(negocio_id));

-- ---------------------------------------------------------------------------
-- compra_items: vía compra → negocio miembro
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS compra_items_delete_propietario ON public.compra_items;
DROP POLICY IF EXISTS compra_items_insert_propietario ON public.compra_items;
DROP POLICY IF EXISTS compra_items_select_propietario ON public.compra_items;
DROP POLICY IF EXISTS compra_items_update_propietario ON public.compra_items;

DROP POLICY IF EXISTS compra_items_delete_member ON public.compra_items;
CREATE POLICY compra_items_delete_member ON public.compra_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.compras c
      WHERE c.id = compra_items.compra_id
        AND is_negocio_member(c.negocio_id)
    )
  );

DROP POLICY IF EXISTS compra_items_insert_member ON public.compra_items;
CREATE POLICY compra_items_insert_member ON public.compra_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.compras c
      WHERE c.id = compra_items.compra_id
        AND is_negocio_member(c.negocio_id)
    )
  );

DROP POLICY IF EXISTS compra_items_select_member ON public.compra_items;
CREATE POLICY compra_items_select_member ON public.compra_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.compras c
      WHERE c.id = compra_items.compra_id
        AND is_negocio_member(c.negocio_id)
    )
  );

DROP POLICY IF EXISTS compra_items_update_member ON public.compra_items;
CREATE POLICY compra_items_update_member ON public.compra_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.compras c
      WHERE c.id = compra_items.compra_id
        AND is_negocio_member(c.negocio_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.compras c
      WHERE c.id = compra_items.compra_id
        AND is_negocio_member(c.negocio_id)
    )
  );

-- ---------------------------------------------------------------------------
-- productos: escritura solo owner|admin; SELECT sin cambios (miembro)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS productos_insert_member ON public.productos;
DROP POLICY IF EXISTS productos_update_member ON public.productos;

DROP POLICY IF EXISTS productos_insert_admin_owner ON public.productos;
CREATE POLICY productos_insert_admin_owner ON public.productos
  FOR INSERT TO authenticated
  WITH CHECK (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text]));

DROP POLICY IF EXISTS productos_update_admin_owner ON public.productos;
CREATE POLICY productos_update_admin_owner ON public.productos
  FOR UPDATE TO authenticated
  USING (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text]))
  WITH CHECK (has_negocio_role(negocio_id, ARRAY['owner'::text, 'admin'::text]));
