"use client";

import { createClient } from "@/lib/supabase/client";
import { insertNegocio } from "@/lib/queries/negocios";
import type { NegocioListItem } from "@/lib/types/negocio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";

type Props = {
  onCreated: (n: NegocioListItem) => void;
};

export function CrearNegocioForm({ onCreated }: Props) {
  const [nombre, setNombre] = useState("");
  const [localizacion, setLocalizacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setError("No se pudo obtener tu usuario.");
        return;
      }
      const { data, error: insErr } = await insertNegocio(supabase, {
        nombre,
        localizacion: localizacion.trim() || null,
        propietario_id: userData.user.id,
      });
      if (insErr) {
        setError(insErr.message);
        return;
      }
      if (data) {
        onCreated(data as NegocioListItem);
        setNombre("");
        setLocalizacion("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Crea tu negocio</CardTitle>
        <CardDescription>
          Aún no tienes ningún negocio registrado. Añade uno para gestionar
          productos y ventas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="negocio-nombre">Nombre del negocio</Label>
            <Input
              id="negocio-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej. Kiosco La Esquina"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="negocio-loc">Ubicación (opcional)</Label>
            <Input
              id="negocio-loc"
              value={localizacion}
              onChange={(e) => setLocalizacion(e.target.value)}
              placeholder="Ciudad o dirección"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Creando…" : "Crear negocio"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
