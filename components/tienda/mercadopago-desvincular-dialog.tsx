"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { unlinkMercadoPagoOAuth } from "@/lib/mercadopago/unlink-oauth-client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
    negocioId: string;
    onUnlinked: () => void;
    size?: "default" | "sm";
    variant?: "outline" | "secondary" | "destructive";
};

export function MercadoPagoDesvincularDialog({
    negocioId,
    onUnlinked,
    size = "default",
    variant = "outline",
}: Props) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);

    const confirm = async () => {
        setPending(true);
        const result = await unlinkMercadoPagoOAuth(negocioId);
        setPending(false);
        if (!result.ok) {
            toast.error("No se pudo desvincular", { description: result.message });
            if (!result.notImplemented) setOpen(false);
            return;
        }
        toast.success("Mercado Pago desvinculado");
        setOpen(false);
        onUnlinked();
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button type='button' size={size === "sm" ? "sm" : "default"} variant={variant}>
                    Desvincular
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Desvincular Mercado Pago?</AlertDialogTitle>
                    <AlertDialogDescription>
                        La tienda dejará de cobrar con QR de Mercado Pago hasta que vincules otra cuenta. Podés volver a conectar cuando
                        quieras desde Configuración, Cobrar o Perfil.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={pending}
                        onClick={(e) => {
                            e.preventDefault();
                            void confirm();
                        }}
                        className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                        {pending ?
                            <>
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' aria-hidden />
                                Desvinculando…
                            </>
                        :   "Sí, desvincular"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
