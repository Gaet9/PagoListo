"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { deleteNegocioById } from "@/lib/queries/negocios";

type Props = {
    negocioId: string;
    negocioNombre: string;
};

export function EliminarNegocioDialog({ negocioId, negocioNombre }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const onConfirm = async () => {
        setLoading(true);
        const supabase = createClient();
        const { error } = await deleteNegocioById(supabase, negocioId);
        setLoading(false);
        if (error) {
            toast.error("No se pudo eliminar la tienda", { description: error.message });
            return;
        }
        toast.success("Tienda eliminada");
        setOpen(false);
        router.refresh();
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button type='button' variant='outline' className='text-destructive hover:bg-destructive/10 hover:text-destructive'>
                    Eliminar tienda
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar esta tienda?</AlertDialogTitle>
                    <AlertDialogDescription className='space-y-2 sm:text-left'>
                        Vas a eliminar la tienda <span className='font-medium text-foreground'>{negocioNombre}</span>. Esta acción es{" "}
                        <span className='font-medium text-foreground'>irreversible</span>: se pierden los datos asociados a ese negocio
                        (productos, ventas, movimientos de stock y demás). Si no estás seguro, tocá Cancelar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <Button type='button' variant='destructive' disabled={loading} onClick={() => void onConfirm()}>
                        {loading ? "Eliminando…" : "Eliminar para siempre"}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
