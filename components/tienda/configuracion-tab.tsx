"use client";

import { useCallback, useEffect, useState } from "react";

import { MercadoPagoCuentaDetalles } from "@/components/tienda/mercadopago-cuenta-detalles";
import { MercadoPagoEstadoBadge } from "@/components/tienda/mercadopago-estado-badge";
import { MercadoPagoVinculacionCtas } from "@/components/tienda/mercadopago-vinculacion-ctas";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { Spinner } from "@/components/ui/spinner";
import { fetchMercadoPagoOAuthStatus } from "@/lib/mercadopago/fetch-oauth-status-client";
import { buildMercadoPagoOAuthStartPath, resolveMercadoPagoOAuthReturnPath } from "@/lib/mercadopago/oauth-start-url";
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

    const startOAuth = () => {
        window.location.href = buildMercadoPagoOAuthStartPath(
            negocioId,
            resolveMercadoPagoOAuthReturnPath(),
        );
    };

    const connected = !!status?.connected;
    const showVincularLabel = wasConnected && !connected;

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

                {error ?
                    <div className='mt-3 space-y-2'>
                        <p className='text-sm text-destructive' role='alert'>{error}</p>
                        <div className='flex flex-wrap gap-2'>
                            <Button type='button' size='sm' variant='outline' onClick={() => void load()}>
                                Reintentar
                            </Button>
                            <Button type='button' size='sm' onClick={startOAuth}>
                                Conectar
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
                        <MercadoPagoCuentaDetalles status={status!} />
                    </div>
                :   null}

                {!loading && !error ?
                    <div className='mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end'>
                        <MercadoPagoVinculacionCtas
                            negocioId={negocioId}
                            connected={connected}
                            vincularLabel={showVincularLabel}
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
