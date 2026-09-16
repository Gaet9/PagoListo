"use client";

import { MercadoPagoDesvincularDialog } from "@/components/tienda/mercadopago-desvincular-dialog";
import { Button } from "@/components/ui/button";

type Props = {
    negocioId: string;
    connected: boolean;
    /** Tras desvincular o fallo previo, usar copy de reconexión. */
    preferReconnectCopy?: boolean;
    onConnect: () => void;
    onUnlinked: () => void;
    size?: "default" | "sm";
};

export function MercadoPagoVinculacionCtas({
    negocioId,
    connected,
    preferReconnectCopy,
    onConnect,
    onUnlinked,
    size = "default",
}: Props) {
    const btnSize = size === "sm" ? "sm" : "default";

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
            <Button type='button' size={btnSize} variant='secondary' onClick={onConnect}>
                Vincular otra cuenta
            </Button>
            <MercadoPagoDesvincularDialog negocioId={negocioId} onUnlinked={onUnlinked} size={size} />
        </div>
    );
}
