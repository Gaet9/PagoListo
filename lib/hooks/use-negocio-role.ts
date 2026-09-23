"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  isNegocioEmployeeRole,
  isNegocioManagerRole,
} from "@/lib/negocio/membership-role";
import {
  getNegocioMembershipRoleForUser,
  resolveMembershipRoleFromQuery,
} from "@/lib/queries/negocio-usuarios";
import type { NegocioMembershipRole } from "@/lib/types/negocio-membership";

export type UseNegocioRoleState = {
  loading: boolean;
  error: string | null;
  role: NegocioMembershipRole | null;
  isManager: boolean;
  isEmployee: boolean;
};

export function useNegocioRole(negocioId: string): UseNegocioRoleState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<NegocioMembershipRole | null>(null);

  const load = useCallback(async () => {
    if (!negocioId) {
      setLoading(false);
      setError(null);
      setRole(null);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      setLoading(false);
      setRole(null);
      setError(authErr?.message ?? "Sesión no disponible");
      return;
    }

    const { data, error: qErr } = await getNegocioMembershipRoleForUser(supabase, negocioId, user.id);
    setLoading(false);
    if (qErr) {
      setRole(null);
      setError(qErr.message);
      return;
    }
    setRole(resolveMembershipRoleFromQuery(data, null));
  }, [negocioId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isManager = !loading && isNegocioManagerRole(role);
  const isEmployee = !loading && isNegocioEmployeeRole(role);

  return {
    loading,
    error,
    role,
    isManager,
    isEmployee,
  };
}
