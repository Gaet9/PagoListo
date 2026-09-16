import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BreadcrumbHomePrefix } from "@/components/breadcrumb-home-prefix";
import { CrearTiendaEnPerfil } from "@/components/perfil/crear-tienda-en-perfil";
import { EliminarNegocioDialog } from "@/components/perfil/eliminar-negocio-dialog";
import { NegocioMercadoPagoStatus } from "@/components/perfil/negocio-mercadopago-status";
import { CambiarContrasenaPerfilCard } from "@/components/perfil/cambiar-contrasena-perfil-card";
import { SuscripcionEstadoResumen } from "@/components/perfil/suscripcion-estado-resumen";
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
import { buildNegocioSlug } from "@/lib/negocio-slug";
import { listNegocios } from "@/lib/queries/negocios";
import { getUsuarioPerfil } from "@/lib/queries/usuarios";
import { fetchUserSubscription, isSubscriptionEnforcementEnabled } from "@/lib/auth/user-subscription";
import { createClient } from "@/lib/supabase/server";
import { Loader2 } from "lucide-react";

async function PerfilContent() {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
        redirect("/auth/login");
    }

    const [{ data: usuario, error: usuarioErr }, { data: negocios, error: negErr }, subscriptionFetch] =
        await Promise.all([
        getUsuarioPerfil(supabase, auth.user.id),
        listNegocios(supabase),
        fetchUserSubscription(supabase, auth.user.id),
    ]);
    const subscriptionRow = subscriptionFetch.error ? null : subscriptionFetch.row;

    if (usuarioErr || !usuario) {
        return (
            <PageShell surface='card' padding='md' rounded='lg'>
                <h2>No se pudo cargar tu perfil</h2>
                <p className='text-sm text-muted-foreground'>{usuarioErr?.message ?? "Error inesperado."}</p>
            </PageShell>
        );
    }

    const negociosList = negocios ?? [];

    return (
        <div className='flex flex-col gap-8'>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbHomePrefix />
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href='/tiendas'>Tiendas</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Perfil</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className='flex items-start justify-between gap-4'>
                <div className='space-y-1'>
                    <h1>Perfil</h1>
                    <p className='text-sm text-muted-foreground'>Tus datos personales y tus negocios.</p>
                </div>
                <Button asChild variant='outline'>
                    <Link href='/tiendas'>Ir a mis tiendas</Link>
                </Button>
            </div>

            <UsuarioPerfilForm initial={usuario} />

            <CambiarContrasenaPerfilCard email={usuario.email} />

            <PageShell as='section' surface='card' padding='md' rounded='lg' className='space-y-3'>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='min-w-0'>
                        <h2>Suscripción</h2>
                        <p className='text-sm text-muted-foreground mt-1'>Gestioná tu suscripción mensual para usar PagoListo.</p>
                    </div>
                    <Button asChild>
                        <Link href='/perfil/subscripciones'>Ver suscripción</Link>
                    </Button>
                </div>
                {subscriptionFetch.error ?
                    <p className="text-sm text-destructive">
                        No se pudo cargar el estado de tu suscripción: {subscriptionFetch.error}
                    </p>
                :   <SuscripcionEstadoResumen row={subscriptionRow} enforcementEnabled={isSubscriptionEnforcementEnabled()} />}
            </PageShell>

            <PageShell as='section' surface='card' padding='md' rounded='lg'>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <h2>Negocios</h2>
                </div>
                <p className='text-sm text-muted-foreground mt-1'>Tus locales asociados a la cuenta. Podés crear más cuando quieras.</p>
                <CrearTiendaEnPerfil />
                {negErr ?
                    <p className='text-sm text-destructive'>{negErr.message}</p>
                : negociosList.length === 0 ?
                    <p className='text-sm text-muted-foreground'>Todavía no tenés negocios creados.</p>
                :   <div className='mt-4 grid gap-3'>
                        {negociosList.map((n) => {
                            const slug = buildNegocioSlug(n, negociosList);
                            return (
                                <div
                                    key={n.id}
                                    className='flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-lg border p-4'>
                                    <div className='min-w-0 flex-1'>
                                        <div className='font-medium truncate'>{n.nombre}</div>
                                        <div className='text-sm text-muted-foreground truncate'>{n.localizacion || "Sin ubicación"}</div>
                                        <NegocioMercadoPagoStatus
                                            negocioId={n.id}
                                            configuracionHref={`/tiendas/${slug}?tab=configuracion`}
                                        />
                                    </div>
                                    <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end shrink-0'>
                                        <EliminarNegocioDialog negocioId={n.id} negocioNombre={n.nombre} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                }
            </PageShell>
        </div>
    );
}

export default function PerfilPage() {
    return (
        <Suspense
            fallback={
                <div className='flex items-center gap-2 text-muted-foreground py-12'>
                    <Loader2 className='h-6 w-6 animate-spin' />
                    Cargando tu perfil…
                </div>
            }>
            <PerfilContent />
        </Suspense>
    );
}
