"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { parseMpOAuthFlashFromSearchParams, stripMpOAuthFlashParams, type MpOAuthFlash } from "@/lib/mercadopago/oauth-return";

type Props = {
    className?: string;
};

export function MercadoPagoOAuthFlashBanner({ className }: Props) {
    const [flash, setFlash] = useState<MpOAuthFlash | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const parsed = parseMpOAuthFlashFromSearchParams(params);
        if (!parsed) return;

        setFlash(parsed);

        const cleaned = stripMpOAuthFlashParams(params);
        const qs = cleaned.toString();
        const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        window.history.replaceState(null, "", next);
    }, []);

    if (!flash) return null;

    if (flash.kind === "ok") {
        return (
            <div
                role='status'
                className={
                    className ??
                    "rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground"
                }>
                <p className='font-medium'>Mercado Pago vinculado</p>
                <p className='mt-0.5 text-muted-foreground'>Ya podés cobrar con QR en el mostrador.</p>
                <p className='mt-2'>
                    <Link href='?tab=cobrar' className='text-sm font-medium text-primary underline-offset-4 hover:underline'>
                        Ir a Cobrar
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <div
            role='alert'
            className={
                className ?? "rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-foreground"
            }>
            <p className='font-medium text-destructive'>No se pudo vincular Mercado Pago</p>
            <p className='mt-0.5 text-muted-foreground'>{flash.message}</p>
        </div>
    );
}
