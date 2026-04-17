import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BreadcrumbHomePrefix } from "@/components/breadcrumb-home-prefix";
import { CrearTiendaEnPerfil } from "@/components/perfil/crear-tienda-en-perfil";
import { EliminarNegocioDialog } from "@/components/perfil/eliminar-negocio-dialog";
import { CambiarContrasenaPerfilCard } from "@/components/perfil/cambiar-contrasena-perfil-card";
import { UsuarioPerfilForm } from "@/components/perfil/usuario-perfil-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { listNegocios } from "@/lib/queries/negocios";
import { listMercadoPagoConexiones } from "@/lib/queries/mercadopago";
import { getUsuarioPerfil } from "@/lib/queries/usuarios";
import { createClient } from "@/lib/supabase/server";
import { Loader2 } from "lucide-react";

async function PerfilContent() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    redirect("/auth/login");
  }

  const [{ data: usuario, error: usuarioErr }, { data: negocios, error: negErr }] =
    await Promise.all([
      getUsuarioPerfil(supabase, auth.user.id),
      listNegocios(supabase),
    ]);

  if (usuarioErr || !usuario) {
    return (
      <PageShell surface="card" padding="md" rounded="lg">
        <h2>No se pudo cargar tu perfil</h2>
        <p className="text-sm text-muted-foreground">
          {usuarioErr?.message ?? "Error inesperado."}
        </p>
      </PageShell>
    );
  }

  const negociosList = negocios ?? [];
  const negocioIds = negociosList.map((n) => n.id);
  const { data: mpConexiones } = await listMercadoPagoConexiones(
    supabase,
    negocioIds,
  );
  const mpByNegocio = new Map(
    (mpConexiones ?? []).map((c) => [c.negocio_id, c]),
  );

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbHomePrefix />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/tiendas">Tiendas</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Perfil</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1>Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Tus datos personales y las conexiones por negocio.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/tiendas">Ir a mis tiendas</Link>
        </Button>
      </div>

      <UsuarioPerfilForm initial={usuario} />

      <CambiarContrasenaPerfilCard email={usuario.email} />

      <PageShell as="section" surface="card" padding="md" rounded="lg">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2>Negocios</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Tus locales asociados a la cuenta. Podés crear más cuando quieras.
        </p>
        <CrearTiendaEnPerfil />
        {negErr ? (
          <p className="text-sm text-destructive">{negErr.message}</p>
        ) : negociosList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tenés negocios creados.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {negociosList.map((n) => {
              const connected = mpByNegocio.has(n.id);
              return (
                <div
                  key={n.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{n.nombre}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {n.localizacion || "Sin ubicación"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      MercadoPago: {connected ? "conectado" : "no conectado"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <Button asChild>
                      <Link href={`/mercadopago/conectar?negocio_id=${n.id}`}>
                        Conectar mi MercadoPago
                      </Link>
                    </Button>
                    <EliminarNegocioDialog negocioId={n.id} negocioNombre={n.nombre} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageShell>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          Cargando tu perfil…
        </div>
      }
    >
      <PerfilContent />
    </Suspense>
  );
}
