"use client";

import { MercadoPagoDesvincularDialog } from "@/components/tienda/mercadopago-desvincular-dialog";
import { Button } from "@/components/ui/button";
import { beginMercadoPagoConnectAnotherAccount } from "@/lib/mercadopago/oauth-connect-another-client";
import { resolveMercadoPagoOAuthReturnPath } from "@/lib/mercadopago/oauth-start-url";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
    const [connectingAnother, setConnectingAnother] = useState(false);

    const connectAnother = async () => {
        setConnectingAnother(true);
        const redirectTo = oauthReturnPath?.trim() || resolveMercadoPagoOAuthReturnPath();
        const result = await beginMercadoPagoConnectAnotherAccount(negocioId, redirectTo);
        setConnectingAnother(false);
        if (!result.ok) {
            toast.error("No se pudo cambiar de cuenta", { description: result.message });
        }
    };

    if (!connected) {
        const label =
            preferReconnectCopy ? "Vincular otra cuenta"
            : "Conectar con Mercado Pago";
        return (
            <Button type='button' size={btnSize} onClick={onConnect}>
                {label}
            </Button>
        );
    }

    return (
        <div className='flex flex-wrap gap-2'>
            <Button
                type='button'
                size={btnSize}
                variant='secondary'
                disabled={connectingAnother}
                onClick={() => void connectAnother()}>
                {connectingAnother ?
                    <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' aria-hidden />
                        Preparando…
                    </>
                :   "Vincular otra cuenta"}
            </Button>
            <MercadoPagoDesvincularDialog negocioId={negocioId} onUnlinked={onUnlinked} size={size} />
        </div>
    );
}
