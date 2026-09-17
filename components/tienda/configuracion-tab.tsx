"use client";

import { useCallback, useEffect, useState } from "react";

import { MercadoPagoCuentaDetalles } from "@/components/tienda/mercadopago-cuenta-detalles";
import { MercadoPagoEstadoBadge } from "@/components/tienda/mercadopago-estado-badge";
import { MercadoPagoVinculacionCtas } from "@/components/tienda/mercadopago-vinculacion-ctas";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { Spinner } from "@/components/ui/spinner";
import { fetchMercadoPagoOAuthStatus } from "@/lib/mercadopago/fetch-oauth-status-client";
import {
    buildMercadoPagoOAuthStartPath,
    resolveMercadoPagoOAuthReturnPath,
    type MercadoPagoOAuthStartPathOptions,
} from "@/lib/mercadopago/oauth-start-url";
import { MERCADOPAGO_CONNECT_ANOTHER_ACCOUNT_HINT } from "@/lib/mercadopago/mp-connect-another-copy";
import { parseMpOAuthFlashFromSearchParams } from "@/lib/mercadopago/oauth-return";
import type { MercadoPagoOAuthStatusResponse } from "@/lib/types/mercadopago-oauth-status";

type Props = { negocioId: string };

export function ConfiguracionTab({ negocioId }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<MercadoPagoOAuthStatusResponse | null>(null);
    const [wasConnected, setWasConnected] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await fetchMercadoPagoOAuthStatus(negocioId);
        setLoading(false);
        if (!result.ok) {
            setStatus(null);
            setError(result.message);
            return;
        }
        setStatus(result.status);
        if (result.status.connected) setWasConnected(true);
    }, [negocioId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const flash = parseMpOAuthFlashFromSearchParams(new URLSearchParams(window.location.search));
        if (flash?.kind === "ok") void load();
    }, [load]);

    const startOAuth = (options?: MercadoPagoOAuthStartPathOptions) => {
        window.location.href = buildMercadoPagoOAuthStartPath(negocioId, resolveMercadoPagoOAuthReturnPath(), options);
    };

    const connected = !!status?.connected;
    const preferReconnect = wasConnected && !connected;

    return (
        <div className='flex flex-col gap-6'>
            <div>
                <h2>Configuración</h2>
                <p className='mt-1 text-sm text-muted-foreground'>Pagos y conexiones de la tienda.</p>
            </div>

            <PageShell as='section' surface='card' padding='md' rounded='lg' maxWidth='content'>
                <div className='flex flex-wrap items-center gap-2'>
                    <h3 className='text-sm font-medium'>Mercado Pago</h3>
                    {!loading && !error ? <MercadoPagoEstadoBadge connected={connected} /> : null}
                </div>
                <p className='mt-2 text-sm text-muted-foreground'>
                    Vinculá la cuenta de Mercado Pago de esta tienda para cobrar con QR en el mostrador. Solo hace falta iniciar sesión en
                    MP y aceptar los permisos.
                </p>

                {error ?
                    <div className='mt-3 space-y-2'>
                        <p className='text-sm text-destructive' role='alert'>{error}</p>
                        <div className='flex flex-wrap gap-2'>
                            <Button type='button' size='sm' variant='outline' onClick={() => void load()}>
                                Reintentar
                            </Button>
                            <Button type='button' size='sm' onClick={() => startOAuth({ reconnect: true })}>
                                Reconectar
                            </Button>
                        </div>
                    </div>
                :   null}

                {loading ?
                    <div className='mt-4 flex items-center gap-2 text-sm text-muted-foreground'>
                        <Spinner className='size-5 shrink-0' aria-hidden />
                        <span>Consultando estado…</span>
                    </div>
                : connected ?
                    <div className='mt-4 space-y-3'>
                        <p className='text-sm text-muted-foreground'>Cuenta lista para cobrar con QR en la pestaña Cobrar.</p>
                        <p className='text-sm text-muted-foreground'>{MERCADOPAGO_CONNECT_ANOTHER_ACCOUNT_HINT}</p>
                        <MercadoPagoCuentaDetalles status={status!} />
                    </div>
                :   <div className='mt-4 space-y-2 text-sm text-muted-foreground'>
                        <p>
                            {preferReconnect ?
                                "La cuenta quedó desvinculada. Podés vincular otra cuenta de Mercado Pago."
                            :   "Todavía no hay una cuenta de Mercado Pago conectada a esta tienda."}
                        </p>
                        {!preferReconnect ?
                            <ol className='list-decimal list-inside space-y-1 pl-0.5'>
                                <li>Tocá «Conectar con Mercado Pago».</li>
                                <li>Iniciá sesión con la cuenta del comercio.</li>
                                <li>Aceptá los permisos y volvé acá automáticamente.</li>
                            </ol>
                        :   null}
                    </div>
                }

                {!loading && !error ?
                    <div className='mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end'>
                        <MercadoPagoVinculacionCtas
                            negocioId={negocioId}
                            connected={connected}
                            preferReconnectCopy={preferReconnect}
                            onConnect={startOAuth}
                            onUnlinked={() => {
                                setWasConnected(true);
                                void load();
                            }}
                        />
                    </div>
                :   null}
            </PageShell>
        </div>
    );
}
