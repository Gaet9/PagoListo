"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import type { MercadoPagoOAuthStatusResponse } from "@/lib/types/mercadopago-oauth-status";

type Props = {
    negocioId: string;
    /** Enlace a la tienda con pestaña Configuración (conectar / cambiar cuenta). */
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

    return (
        <div className='mt-3 space-y-2 border-t border-border/60 pt-3'>
            <p className='text-xs font-medium text-muted-foreground'>Mercado Pago</p>

            {loading ?
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                    <Spinner className='size-4 shrink-0' aria-hidden />
                    <span>Cargando…</span>
                </div>
            : error ?
                <p className='text-xs text-destructive'>{error}</p>
            : status?.connected ?
                <div className='space-y-1 text-xs text-muted-foreground'>
                    <p>
                        <span className='text-foreground font-medium'>Conectado</span>
                        {status.account_label ?
                            <span className='text-muted-foreground'> — {status.mp_user_id}</span>
                        :   null}
                    </p>
                    {status.account_email ?
                        <p>
                            Email: <span className='text-foreground'>{status.account_email}</span>
                        </p>
                    :   null}
                    {status.account_nickname && !status.account_email ?
                        <p>
                            Usuario: <span className='text-foreground'>{status.account_nickname}</span>
                        </p>
                    :   null}
                </div>
            :   <p className='text-xs text-muted-foreground'>
                    <span className='text-foreground font-medium'>No conectado</span>
                </p>
            }

            <p className='text-xs'>
                <Link href={configuracionHref} className='text-primary underline-offset-4 hover:underline'>
                    Configurar en la tienda
                </Link>
            </p>
        </div>
    );
}
