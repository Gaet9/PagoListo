"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { UsuarioPerfil } from "@/lib/queries/usuarios";
import { updateUsuarioPerfil } from "@/lib/queries/usuarios";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  initial: UsuarioPerfil;
};

export function UsuarioPerfilForm({ initial }: Props) {
  const [nombre, setNombre] = useState(initial.nombre ?? "");
  const [apellido, setApellido] = useState(initial.apellido ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updErr } = await updateUsuarioPerfil(supabase, {
        id: initial.id,
        nombre,
        apellido,
      });
      if (updErr) {
        setError(updErr.message);
        return;
      }
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos personales</CardTitle>
        <CardDescription>
          Actualizá tu información. El correo es el de tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="perfil-email">Correo</Label>
            <Input id="perfil-email" value={initial.email} readOnly disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="perfil-nombre">Nombre</Label>
            <Input
              id="perfil-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="given-name"
              required
              placeholder="Ej. Juan"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="perfil-apellido">Apellido</Label>
            <Input
              id="perfil-apellido"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              autoComplete="family-name"
              placeholder="Ej. Pérez"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {saved ? <p className="text-sm text-emerald-600">Guardado.</p> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

