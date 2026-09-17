"use client";

import { useState } from "react";

import { MercadoPagoDesvincularDialog } from "@/components/tienda/mercadopago-desvincular-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { beginMercadoPagoConnectAnotherAccount } from "@/lib/mercadopago/oauth-reconnect-client";
import { resolveMercadoPagoOAuthReturnPath } from "@/lib/mercadopago/oauth-start-url";

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
    const [connectAnotherError, setConnectAnotherError] = useState<string | null>(null);

    const startConnectAnother = () => {
        if (connectingAnother) return;
        setConnectAnotherError(null);
        setConnectingAnother(true);
        const redirectTo = oauthReturnPath?.trim() || resolveMercadoPagoOAuthReturnPath();
        void beginMercadoPagoConnectAnotherAccount(negocioId, redirectTo).then((result) => {
            if (!result.ok) {
                setConnectingAnother(false);
                setConnectAnotherError(result.message);
            }
        });
    };

    if (!connected) {
        const label =
            preferReconnectCopy ? "Vincular otra cuenta"
            : "Conectar con Mercado Pago";
        const useReconnectFlow = !!preferReconnectCopy;
        return (
            <div className='flex flex-col items-stretch gap-2 sm:items-end'>
                {connectAnotherError ?
                    <p className='text-sm text-destructive' role='alert'>{connectAnotherError}</p>
                :   null}
                <Button
                    type='button'
                    size={btnSize}
                    disabled={connectingAnother && useReconnectFlow}
                    onClick={useReconnectFlow ? startConnectAnother : onConnect}>
                    {connectingAnother && useReconnectFlow ?
                        <>
                            <Spinner className='size-4 shrink-0' aria-hidden />
                            <span>Desvinculando…</span>
                        </>
                    :   label}
                </Button>
            </div>
        );
    }

    return (
        <div className='flex flex-col items-stretch gap-2 sm:items-end'>
            {connectAnotherError ?
                <p className='text-sm text-destructive' role='alert'>{connectAnotherError}</p>
            :   null}
            <div className='flex flex-wrap justify-end gap-2'>
                <Button
                    type='button'
                    size={btnSize}
                    variant='secondary'
                    disabled={connectingAnother}
                    onClick={startConnectAnother}>
                    {connectingAnother ?
                        <>
                            <Spinner className='size-4 shrink-0' aria-hidden />
                            <span>Desvinculando…</span>
                        </>
                    :   "Vincular otra cuenta"}
                </Button>
                <MercadoPagoDesvincularDialog negocioId={negocioId} onUnlinked={onUnlinked} size={size} />
            </div>
        </div>
    );
}
