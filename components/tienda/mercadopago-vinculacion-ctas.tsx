"use client";

import { MercadoPagoDesvincularDialog } from "@/components/tienda/mercadopago-desvincular-dialog";
import { Button } from "@/components/ui/button";

type Props = {
    negocioId: string;
    connected: boolean;
    /** Tras desvincular en esta sesión, mostrar «Vincular» en lugar de «Conectar con Mercado Pago». */
    vincularLabel?: boolean;
    onConnect: () => void;
    onUnlinked: () => void;
    size?: "default" | "sm";
};

export function MercadoPagoVinculacionCtas({
    negocioId,
    connected,
    vincularLabel,
    onConnect,
    onUnlinked,
    size = "default",
}: Props) {
    const btnSize = size === "sm" ? "sm" : "default";

    if (!connected) {
        const label = vincularLabel ? "Vincular" : "Conectar con Mercado Pago";
        return (
            <div className='flex flex-col items-stretch gap-2 sm:items-end'>
                <Button type='button' size={btnSize} onClick={onConnect}>
                    {label}
                </Button>
            </div>
        );
    }

    return (
        <div className='flex flex-col items-stretch gap-2 sm:items-end'>
            <MercadoPagoDesvincularDialog negocioId={negocioId} onUnlinked={onUnlinked} size={size} />
        </div>
    );
}
