"use client";

import { MercadoPagoDesvincularDialog } from "@/components/tienda/mercadopago-desvincular-dialog";
import { Button } from "@/components/ui/button";

type Props = {
    negocioId: string;
    connected: boolean;
    onConnect: () => void;
    onUnlinked: () => void;
    size?: "default" | "sm";
};

export function MercadoPagoVinculacionCtas({ negocioId, connected, onConnect, onUnlinked, size = "default" }: Props) {
    const btnSize = size === "sm" ? "sm" : "default";

    if (!connected) {
        return (
            <div className='flex flex-col items-stretch gap-2 sm:items-end'>
                <Button type='button' size={btnSize} onClick={onConnect}>
                    Vincular
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
