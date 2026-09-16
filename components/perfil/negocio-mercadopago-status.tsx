"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { MercadoPagoCuentaDetalles } from "@/components/tienda/mercadopago-cuenta-detalles";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { buildMercadoPagoOAuthStartPath } from "@/lib/mercadopago/oauth-start-url";
import type { MercadoPagoOAuthStatusResponse } from "@/lib/types/mercadopago-oauth-status";

type Props = {
    negocioId: string;
    /** Enlace a la tienda con pestaña Configuración (detalle y cambiar cuenta). */
    configuracionHref: string;
};

export function NegocioMercadoPagoStatus({ negocioId, configuracionHref }: Props) {
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
            setError(e instanceof Error ? e.message : "No se pudo cargar Mercado Pago.");
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        void load();
    }, [load]);

    const connectHref = buildMercadoPagoOAuthStartPath(negocioId, "/perfil");

    return (
        <div className='mt-3 space-y-2 border-t border-border/60 pt-3'>
            <p className='text-xs font-medium text-muted-foreground'>Mercado Pago</p>

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
                </div>
            : status?.connected ?
                <div className='space-y-1'>
                    <p className='text-xs font-medium text-foreground'>Vinculado para cobrar con QR</p>
                    <MercadoPagoCuentaDetalles status={status} size='sm' />
                </div>
            :   <div className='space-y-2'>
                    <p className='text-xs text-muted-foreground'>Sin cuenta vinculada. Conectá Mercado Pago para facturar/cobrar.</p>
                    <Button type='button' size='sm' className='h-8' onClick={() => (window.location.href = connectHref)}>
                        Conectar Mercado Pago
                    </Button>
                </div>
            }

            <p className='text-xs'>
                <Link href={configuracionHref} className='text-primary underline-offset-4 hover:underline'>
                    Ver en Configuración de la tienda
                </Link>
            </p>
        </div>
    );
}
