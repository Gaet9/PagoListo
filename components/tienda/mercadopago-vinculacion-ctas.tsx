"use client";

import { MercadoPagoDesvincularDialog } from "@/components/tienda/mercadopago-desvincular-dialog";
import { Button } from "@/components/ui/button";
import { buildMercadoPagoOAuthStartPath, resolveMercadoPagoOAuthReturnPath } from "@/lib/mercadopago/oauth-start-url";

type Props = {
    negocioId: string;
    connected: boolean;
    /** Ruta de retorno post-OAuth; si falta, se infiere del path actual (Configuración). */
    oauthReturnPath?: string;
    /** Tras desvincular o fallo previo, usar copy de reconexión. */
    preferReconnectCopy?: boolean;
    onConnect: () => void;
    onUnlinked: () => void;
    size?: "default" | "sm";
};

export function MercadoPagoVinculacionCtas({
    negocioId,
    connected,
    oauthReturnPath,
    preferReconnectCopy,
    onConnect,
    onUnlinked,
    size = "default",
}: Props) {
    const btnSize = size === "sm" ? "sm" : "default";

    const startReconnectOAuth = () => {
        const redirectTo = oauthReturnPath?.trim() || resolveMercadoPagoOAuthReturnPath();
        window.location.href = buildMercadoPagoOAuthStartPath(negocioId, redirectTo, { reconnect: true });
    };

    if (!connected) {
        const label =
            preferReconnectCopy ? "Vincular otra cuenta"
            : "Conectar con Mercado Pago";
        return (
            <Button type='button' size={btnSize} onClick={preferReconnectCopy ? startReconnectOAuth : onConnect}>
                {label}
            </Button>
        );
    }

    return (
        <div className='flex flex-wrap gap-2'>
            <Button type='button' size={btnSize} variant='secondary' onClick={startReconnectOAuth}>
                Vincular otra cuenta
            </Button>
            <MercadoPagoDesvincularDialog negocioId={negocioId} onUnlinked={onUnlinked} size={size} />
        </div>
    );
}
