"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { Spinner } from "@/components/ui/spinner";
import type { MercadoPagoOAuthStatusResponse } from "@/lib/types/mercadopago-oauth-status";

type Props = { negocioId: string };

function connectedSubtitle(status: MercadoPagoOAuthStatusResponse): string {
    if (status.account_label) return `Cuenta conectada: ${status.mp_user_id}`;
    if (status.mp_user_id) return `Cuenta conectada (ID Mercado Pago: ${status.mp_user_id}).`;
    return "Mercado Pago está conectado.";
}

function buildOAuthStartUrl(negocioId: string) {
    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("tab")) params.set("tab", "configuracion");
    const qs = params.toString();
    const redirectTo = qs ? `${pathname}?${qs}` : `${pathname}?tab=configuracion`;
    return `/api/mercadopago/oauth/start?negocioId=${encodeURIComponent(negocioId)}&redirectTo=${encodeURIComponent(redirectTo)}`;
}

export function ConfiguracionTab({ negocioId }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<MercadoPagoOAuthStatusResponse | null>(null);

    const load = useCallback(
        async (clearStatus: boolean) => {
            if (clearStatus) setStatus(null);
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
        },
        [negocioId],
    );

    useEffect(() => {
        void load(true);
    }, [load]);

    const subtitle = useMemo((): string | null => {
        if (loading) {
            if (status?.connected) return connectedSubtitle(status);
            return null;
        }
        if (!status) return null;
        if (!status.connected) return "Mercado Pago no está conectado para esta tienda.";
        return connectedSubtitle(status);
    }, [loading, status]);

    return (
        <div className='flex flex-col gap-6'>
            <div>
                <h2>Configuración</h2>
                <p className='mt-1 text-sm text-muted-foreground'>Pagos y conexiones de la tienda.</p>
            </div>

            <PageShell as='section' surface='card' padding='md' rounded='lg' maxWidth='content'>
                <h3 className='text-sm font-medium'>Mercado Pago</h3>
                {subtitle ?
                    <p className='mt-2 text-sm text-muted-foreground'>{subtitle}</p>
                :   null}

                {error ?
                    <p className='mt-3 text-sm text-destructive'>{error}</p>
                :   null}

                {loading ?
                    <div className='mt-3 flex items-center gap-2 text-sm text-muted-foreground'>
                        <Spinner className='size-5 shrink-0' aria-hidden />
                        <span>Cargando estado…</span>
                    </div>
                :   null}

                {!loading && status?.connected && status.account_email ?
                    <p className='mt-2 text-xs text-muted-foreground'>
                        Email: <span className='text-foreground'>{status.account_email}</span>
                    </p>
                :   null}

                {!loading && status?.connected && status.account_nickname && !status.account_email ?
                    <p className='mt-2 text-xs text-muted-foreground'>
                        Usuario: <span className='text-foreground'>{status.account_nickname}</span>
                    </p>
                :   null}

                <div className='mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end'>
                    {!loading && !status?.connected ?
                        <Button type='button' onClick={() => (window.location.href = buildOAuthStartUrl(negocioId))}>
                            Conectar a Mercado Pago
                        </Button>
                    :   null}

                    {!loading && status?.connected ?
                        <Button type='button' variant='secondary' onClick={() => (window.location.href = buildOAuthStartUrl(negocioId))}>
                            Cambiar cuenta
                        </Button>
                    :   null}

                    {!loading ?
                        <Button type='button' variant='outline' onClick={() => void load(false)}>
                            Actualizar
                        </Button>
                    :   null}
                </div>
            </PageShell>
        </div>
    );
}
