import type { MercadoPagoOAuthStatusResponse } from "@/lib/types/mercadopago-oauth-status";

type Props = {
    status: MercadoPagoOAuthStatusResponse;
    size?: "sm" | "md";
};

export function MercadoPagoCuentaDetalles({ status, size = "md" }: Props) {
    if (!status.connected) return null;

    const textClass = size === "sm" ? "text-xs" : "text-sm";

    return (
        <div className={`space-y-1 ${textClass} text-muted-foreground`}>
            {status.mp_user_id != null ?
                <p>
                    ID Mercado Pago: <span className='text-foreground font-medium tabular-nums'>{status.mp_user_id}</span>
                </p>
            :   null}
            {status.account_email ?
                <p>
                    Email: <span className='text-foreground'>{status.account_email}</span>
                </p>
            :   null}
            {status.account_nickname && !status.account_email ?
                <p>
                    Usuario: <span className='text-foreground'>{status.account_nickname}</span>
                </p>
            :   null}
            {!status.account_email && !status.account_nickname && status.account_label ?
                <p>
                    Cuenta: <span className='text-foreground'>{status.account_label}</span>
                </p>
            :   null}
        </div>
    );
}
