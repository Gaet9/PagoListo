"use client";

import { MercadoPagoOAuthStatusBanner } from "@/components/tienda/mercadopago-oauth-status-banner";

type Props = {
    negocioId: string;
    configuracionHref: string;
};

export function NegocioMercadoPagoStatus({ negocioId, configuracionHref }: Props) {
    return (
        <div className='mt-3 border-t border-border/60 pt-3'>
            <MercadoPagoOAuthStatusBanner
                negocioId={negocioId}
                oauthReturnPath='/perfil'
                variant='compact'
                configuracionHref={configuracionHref}
            />
        </div>
    );
}
