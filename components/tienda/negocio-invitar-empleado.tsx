"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/ui/page-shell";
import { Spinner } from "@/components/ui/spinner";
import { negocioMembershipRoleLabel, parseNegocioMembershipRole } from "@/lib/negocio/membership-role";
import type { NegocioMiembroListItem } from "@/lib/types/negocio-membership";

type Props = {
  negocioId: string;
};

function memberDisplayName(miembro: NegocioMiembroListItem): string {
  const perfil = miembro.usuarios;
  if (!perfil) return "Sin datos de perfil";
  const nombre = [perfil.nombre, perfil.apellido].filter(Boolean).join(" ").trim();
  if (nombre) return nombre;
  return perfil.email;
}

export function NegocioInvitarEmpleado({ negocioId }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [miembros, setMiembros] = useState<NegocioMiembroListItem[]>([]);

  const loadMiembros = useCallback(async () => {
    setLoadingMembers(true);
    setMembersError(null);
    try {
      const res = await fetch(`/api/negocios/miembros?negocioId=${encodeURIComponent(negocioId)}`);
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        miembros?: NegocioMiembroListItem[];
      };
      if (!res.ok) {
        setMiembros([]);
        setMembersError(payload.error ?? "No se pudo cargar el equipo");
        return;
      }
      setMiembros(Array.isArray(payload.miembros) ? payload.miembros : []);
    } finally {
      setLoadingMembers(false);
    }
  }, [negocioId]);

  useEffect(() => {
    void loadMiembros();
  }, [loadMiembros]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Ingresá un correo");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/negocios/miembros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negocioId, email: trimmed, role: "employee" }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(payload.error ?? "No se pudo agregar al empleado");
        return;
      }
      toast.success("Empleado agregado");
      setEmail("");
      await loadMiembros();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell as="section" surface="card" padding="md" rounded="lg" maxWidth="content">
      <h3 className="text-sm font-medium">Equipo</h3>
      <p className="mt-1 text-sm text-muted-foreground">Agregá un empleado con su correo de cuenta.</p>

      <div className="mt-4">
        {loadingMembers ?
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-5 shrink-0" aria-hidden />
            <span>Cargando equipo…</span>
          </div>
        : membersError ?
          <div className="space-y-2">
            <p className="text-sm text-destructive" role="alert">{membersError}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadMiembros()}>
              Reintentar
            </Button>
          </div>
        : miembros.length === 0 ?
          <p className="text-sm text-muted-foreground">Todavía no hay miembros en el equipo.</p>
        :   <ul className="divide-y divide-border rounded-md border border-border">
            {miembros.map((miembro) => {
              const role = parseNegocioMembershipRole(miembro.role) ?? "employee";
              const emailLabel = miembro.usuarios?.email;
              return (
                <li key={miembro.usuario_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{memberDisplayName(miembro)}</p>
                    {emailLabel ?
                      <p className="text-muted-foreground truncate">{emailLabel}</p>
                    : null}
                  </div>
                  <span className="shrink-0 text-muted-foreground">{negocioMembershipRoleLabel(role)}</span>
                </li>
              );
            })}
          </ul>
        }
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid gap-1 flex-1 min-w-0">
          <Label htmlFor="invitar-email">Correo</Label>
          <Input
            id="invitar-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="empleado@ejemplo.com"
            disabled={submitting}
          />
        </div>
        <Button type="submit" disabled={submitting} className="shrink-0">
          {submitting ?
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          :   "Agregar empleado"}
        </Button>
      </form>
    </PageShell>
  );
}
