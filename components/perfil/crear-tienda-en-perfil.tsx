"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CrearNegocioForm } from "@/components/tienda/crear-negocio-form";
import { Button } from "@/components/ui/button";
export function CrearTiendaEnPerfil() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const onCreated = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      {open ?
        <CrearNegocioForm
          onCreated={onCreated}
          onCancel={() => setOpen(false)}
          title="Nueva tienda"
          description="Creá otro negocio para gestionarlo por separado (productos, ventas y stock)."
          submitLabel="Crear tienda"
        />
      : <Button type="button" onClick={() => setOpen(true)}>
          Crear nueva tienda
        </Button>}
    </div>
  );
}
