"use client";

import { useCallback, useEffect, useState } from "react";

import { MercadoPagoCuentaDetalles } from "@/components/tienda/mercadopago-cuenta-detalles";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { Spinner } from "@/components/ui/spinner";
import { buildMercadoPagoOAuthStartPath } from "@/lib/mercadopago/oauth-start-url";
import { parseMpOAuthFlashFromSearchParams } from "@/lib/mercadopago/oauth-return";
import type { MercadoPagoOAuthStatusResponse } from "@/lib/types/mercadopago-oauth-status";

type Props = { negocioId: string };

export function ConfiguracionTab({ negocioId }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<MercadoPagoOAuthStatusResponse | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/mercadopago/oauth/status?negocioId=${encodeURIComponent(negocioId)}`, {
                method: "GET",
                credentials: "same-origin",
            });
            const data = (await res.json().catch(() => ({}))) as MercadoPagoOAuthStatusResponse & { error?: string };
            if (!res.ok) {
                throw new Error(data.error || `Error ${res.status}`);
            }
            setStatus(data);
        } catch (e) {
            setStatus(null);
            setError(e instanceof Error ? e.message : "No se pudo cargar el estado de Mercado Pago.");
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const flash = parseMpOAuthFlashFromSearchParams(new URLSearchParams(window.location.search));
        if (flash?.kind === "ok") {
            void load();
        }
    }, [load]);

    const startOAuth = () => {
        window.location.href = buildMercadoPagoOAuthStartPath(negocioId);
    };

    return (
        <div className='flex flex-col gap-6'>
            <div>
                <h2>Configuración</h2>
                <p className='mt-1 text-sm text-muted-foreground'>Pagos y conexiones de la tienda.</p>
            </div>

            <PageShell as='section' surface='card' padding='md' rounded='lg' maxWidth='content'>
                <h3 className='text-sm font-medium'>Mercado Pago</h3>
                <p className='mt-2 text-sm text-muted-foreground'>
                    Vinculá la cuenta de Mercado Pago de esta tienda para cobrar con QR en el mostrador. Solo hace falta iniciar sesión en
                    MP y aceptar los permisos.
                </p>

                {error ?
                    <p className='mt-3 text-sm text-destructive' role='alert'>{error}</p>
                :   null}

                {loading ?
                    <div className='mt-4 flex items-center gap-2 text-sm text-muted-foreground'>
                        <Spinner className='size-5 shrink-0' aria-hidden />
                        <span>Consultando estado…</span>
                    </div>
                : status?.connected ?
                    <div className='mt-4 space-y-3'>
                        <p className='text-sm'>
                            <span className='font-medium text-foreground'>Cuenta vinculada</span>
                        </p>
                        <MercadoPagoCuentaDetalles status={status} />
                    </div>
                :   <div className='mt-4 space-y-2 text-sm text-muted-foreground'>
                        <p>Todavía no hay una cuenta de Mercado Pago conectada a esta tienda.</p>
                        <ol className='list-decimal list-inside space-y-1 pl-0.5'>
                            <li>Tocá «Conectar con Mercado Pago».</li>
                            <li>Iniciá sesión con la cuenta del comercio.</li>
                            <li>Aceptá los permisos y volvé acá automáticamente.</li>
                        </ol>
                    </div>
                }

                <div className='mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end'>
                    {!loading && !status?.connected ?
                        <Button type='button' onClick={startOAuth}>
                            Conectar con Mercado Pago
                        </Button>
                    :   null}

                    {!loading && status?.connected ?
                        <Button type='button' variant='secondary' onClick={startOAuth}>
                            Cambiar cuenta
                        </Button>
                    :   null}
                </div>
            </PageShell>
        </div>
    );
}
