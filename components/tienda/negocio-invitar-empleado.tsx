"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/ui/page-shell";

type Props = {
  negocioId: string;
};

export function NegocioInvitarEmpleado({ negocioId }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell as="section" surface="card" padding="md" rounded="lg" maxWidth="content">
      <h3 className="text-sm font-medium">Equipo</h3>
      <p className="mt-1 text-sm text-muted-foreground">Agregá un empleado con su correo de cuenta.</p>
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
