"use client";

import { MercadoPagoOAuthStatusBanner } from "@/components/tienda/mercadopago-oauth-status-banner";

type Props = {
    negocioId: string;
    configuracionHref?: string;
    allowOAuthManagement?: boolean;
};

export function NegocioMercadoPagoStatus({
    negocioId,
    configuracionHref,
    allowOAuthManagement = true,
}: Props) {
    if (!allowOAuthManagement) {
        return null;
    }

    return (
        <div className='mt-3 border-t border-border/60 pt-3'>
            <MercadoPagoOAuthStatusBanner
                negocioId={negocioId}
                oauthReturnPath='/perfil'
                variant='compact'
                configuracionHref={configuracionHref}
                allowOAuthManagement={allowOAuthManagement}
            />
        </div>
    );
}
