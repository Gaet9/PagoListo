"use client";

import Link from "next/link";

import { MercadoPagoCuentaDetalles } from "@/components/tienda/mercadopago-cuenta-detalles";
import { MercadoPagoEstadoBadge } from "@/components/tienda/mercadopago-estado-badge";
import { MercadoPagoVinculacionCtas } from "@/components/tienda/mercadopago-vinculacion-ctas";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { fetchMercadoPagoOAuthStatus } from "@/lib/mercadopago/fetch-oauth-status-client";
import { MERCADOPAGO_CONNECT_ANOTHER_ACCOUNT_HINT } from "@/lib/mercadopago/mp-connect-another-copy";
import { buildMercadoPagoOAuthStartPath } from "@/lib/mercadopago/oauth-start-url";
import { parseMpOAuthFlashFromSearchParams } from "@/lib/mercadopago/oauth-return";
import type { MercadoPagoOAuthStatusResponse } from "@/lib/types/mercadopago-oauth-status";
import { useCallback, useEffect, useState } from "react";

type Variant = "cobrar" | "compact";

type Props = {
    negocioId: string;
    oauthReturnPath: string;
    variant?: Variant;
    configuracionHref?: string;
    /** Si cambia, se vuelve a consultar el estado. */
    refreshKey?: number;
    /** Notifica vinculación MP (p. ej. para habilitar cobro QR en Cobrar). */
    onConnectionChange?: (connected: boolean) => void;
};

export function MercadoPagoOAuthStatusBanner({
    negocioId,
    oauthReturnPath,
    variant = "cobrar",
    configuracionHref,
    refreshKey = 0,
    onConnectionChange,
}: Props) {
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
            onConnectionChange?.(false);
            return;
        }
        setStatus(result.status);
        onConnectionChange?.(result.status.connected);
        if (result.status.connected) setWasConnected(true);
    }, [negocioId, onConnectionChange]);

    useEffect(() => {
        void load();
    }, [load, refreshKey]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const flash = parseMpOAuthFlashFromSearchParams(new URLSearchParams(window.location.search));
        if (flash?.kind === "ok") void load();
    }, [load]);

    const startConnect = (options?: { reconnect?: boolean }) => {
        window.location.href = buildMercadoPagoOAuthStartPath(negocioId, oauthReturnPath, options);
    };

    const connected = !!status?.connected;
    const preferReconnect = wasConnected && !connected;

    if (variant === "compact") {
        return (
            <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2'>
                    <p className='text-xs font-medium text-muted-foreground'>Mercado Pago</p>
                    {!loading && !error ? <MercadoPagoEstadoBadge connected={connected} /> : null}
                </div>
                {loading ?
                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                        <Spinner className='size-4 shrink-0' aria-hidden />
                        <span>Cargando…</span>
                    </div>
                : error ?
                    <div className='space-y-2'>
                        <p className='text-xs text-destructive' role='alert'>{error}</p>
                        <Button type='button' size='sm' variant='outline' className='h-8' onClick={() => void load()}>
                            Reintentar
                        </Button>
                        <Button type='button' size='sm' className='h-8' onClick={() => startConnect()}>
                            Reconectar
                        </Button>
                    </div>
                : connected ?
                    <div className='space-y-2'>
                        <p className='text-xs text-muted-foreground'>{MERCADOPAGO_CONNECT_ANOTHER_ACCOUNT_HINT}</p>
                        <MercadoPagoCuentaDetalles status={status!} size='sm' />
                        <MercadoPagoVinculacionCtas
                            negocioId={negocioId}
                            connected
                            oauthReturnPath={oauthReturnPath}
                            onConnect={startConnect}
                            onUnlinked={() => {
                                setWasConnected(true);
                                void load();
                            }}
                            size='sm'
                        />
                    </div>
                :   <div className='space-y-2'>
                        <p className='text-xs text-muted-foreground'>
                            {preferReconnect ?
                                "La cuenta quedó desvinculada. Podés vincular otra cuenta de Mercado Pago."
                            :   "Sin cuenta vinculada. Conectá Mercado Pago para cobrar con QR."}
                        </p>
                        <MercadoPagoVinculacionCtas
                            negocioId={negocioId}
                            connected={false}
                            oauthReturnPath={oauthReturnPath}
                            preferReconnectCopy={preferReconnect}
                            onConnect={startConnect}
                            onUnlinked={() => void load()}
                            size='sm'
                        />
                    </div>
                }
                {configuracionHref ?
                    <p className='text-xs'>
                        <Link href={configuracionHref} className='text-primary underline-offset-4 hover:underline'>
                            Ver en Configuración de la tienda
                        </Link>
                    </p>
                :   null}
            </div>
        );
    }

    return (
        <section className='rounded-lg border bg-card p-4 flex flex-col gap-3' aria-labelledby='mp-oauth-status-heading'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3'>
                <div className='min-w-0 flex flex-wrap items-center gap-2'>
                    <h3 id='mp-oauth-status-heading' className='text-sm font-medium'>Mercado Pago</h3>
                    {!loading && !error ? <MercadoPagoEstadoBadge connected={connected} /> : null}
                </div>
                {configuracionHref ?
                    <Link
                        href={configuracionHref}
                        className='text-xs text-primary underline-offset-4 hover:underline shrink-0'>
                        Más opciones en Configuración
                    </Link>
                :   null}
            </div>

            {loading ?
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Spinner className='size-5 shrink-0' aria-hidden />
                    <span>Consultando vinculación…</span>
                </div>
            : error ?
                <div className='space-y-2'>
                    <p className='text-sm text-destructive' role='alert'>{error}</p>
                    <div className='flex flex-wrap gap-2'>
                        <Button type='button' size='sm' variant='outline' onClick={() => void load()}>
                            Reintentar
                        </Button>
                        <Button type='button' size='sm' onClick={() => startConnect()}>
                            Reconectar
                        </Button>
                    </div>
                </div>
            : connected ?
                <div className='space-y-3'>
                    <p className='text-sm text-muted-foreground'>Ya podés cobrar con QR en esta pestaña.</p>
                    <p className='text-sm text-muted-foreground'>{MERCADOPAGO_CONNECT_ANOTHER_ACCOUNT_HINT}</p>
                    <MercadoPagoCuentaDetalles status={status!} />
                    <MercadoPagoVinculacionCtas
                        negocioId={negocioId}
                        connected
                        oauthReturnPath={oauthReturnPath}
                        onConnect={startConnect}
                        onUnlinked={() => {
                            setWasConnected(true);
                            void load();
                        }}
                    />
                </div>
            :   <div className='space-y-3'>
                    <p className='text-sm text-muted-foreground'>
                        {preferReconnect ?
                            "La cuenta quedó desvinculada. Vinculá otra cuenta para seguir cobrando con QR."
                        :   "Todavía no conectaste Mercado Pago. El proceso tarda un minuto: iniciás sesión en MP y volvés acá."}
                    </p>
                    {!preferReconnect ?
                        <ol className='list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-0.5'>
                            <li>Tocá «Conectar con Mercado Pago».</li>
                            <li>Iniciá sesión con la cuenta del comercio.</li>
                            <li>Aceptá los permisos y volvé a Cobrar.</li>
                        </ol>
                    :   null}
                    <MercadoPagoVinculacionCtas
                        negocioId={negocioId}
                        connected={false}
                        oauthReturnPath={oauthReturnPath}
                        preferReconnectCopy={preferReconnect}
                        onConnect={startConnect}
                        onUnlinked={() => void load()}
                    />
                </div>
            }
        </section>
    );
}
