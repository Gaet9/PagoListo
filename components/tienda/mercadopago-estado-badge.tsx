import { cn } from "@/lib/utils";

type Props = {
    connected: boolean;
    className?: string;
};

/** Estados de vinculación MP (ES-AR). */
export function MercadoPagoEstadoBadge({ connected, className }: Props) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                connected ?
                    "border-primary/40 bg-primary/10 text-foreground"
                :   "border-border bg-muted text-muted-foreground",
                className,
            )}>
            {connected ? "Vinculada" : "Desvinculada"}
        </span>
    );
}
