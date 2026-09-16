"use client";

import Link from "next/link";

import { MercadoPagoOAuthFlashBanner } from "@/components/tienda/mercadopago-oauth-flash";

type Props = {
    primeraTiendaHref?: string;
};

export function PerfilOAuthFlash({ primeraTiendaHref }: Props) {
    return (
        <div className='space-y-2'>
            <MercadoPagoOAuthFlashBanner />
            {primeraTiendaHref ?
                <p className='text-xs text-muted-foreground'>
                    <Link href={`${primeraTiendaHref}${primeraTiendaHref.includes("?") ? "&" : "?"}tab=cobrar`} className='text-primary underline-offset-4 hover:underline'>
                        Ir a Cobrar en tu tienda
                    </Link>
                </p>
            :   null}
        </div>
    );
}
