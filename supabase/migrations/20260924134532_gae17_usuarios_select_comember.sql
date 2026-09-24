-- GAE-17 Equipo list: co-member SELECT on public.usuarios.
-- Fixes listNegocioMiembros embed when usuarios_select_own hid peer rows
-- (PostgREST can drop parent rows when the embed is filtered by RLS).
-- Least privilege: only users who share ≥1 negocio via negocio_usuarios.
-- Keeps existing usuarios_select_own. Prod apply only after Gaétan GO.

CREATE OR REPLACE FUNCTION public.shares_negocio_with(p_other_usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.negocio_usuarios AS mine
    INNER JOIN public.negocio_usuarios AS theirs
      ON theirs.negocio_id = mine.negocio_id
    WHERE mine.usuario_id = auth.uid()
      AND theirs.usuario_id = p_other_usuario_id
  );
$function$;

REVOKE ALL ON FUNCTION public.shares_negocio_with(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shares_negocio_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_negocio_with(uuid) TO service_role;

DROP POLICY IF EXISTS usuarios_select_comember ON public.usuarios;

CREATE POLICY usuarios_select_comember
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (public.shares_negocio_with(id));
