"use client";

import { useState } from "react";
import { toast } from "sonner";

import { verifyCurrentPassword, updateSessionPassword } from "@/lib/auth/change-password";
import { PASSWORD_MIN_LENGTH, validateNewPasswordStrength } from "@/lib/auth/password-policy";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Phase = "idle" | "verify" | "new";

type Props = {
    email: string;
};

export function CambiarContrasenaPerfilCard({ email }: Props) {
    const [phase, setPhase] = useState<Phase>("idle");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const resetAll = () => {
        setPhase("idle");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
        setLoading(false);
    };

    const onVerifyCurrent = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!currentPassword) {
            setError("Ingresá tu contraseña actual.");
            return;
        }
        setLoading(true);
        try {
            const supabase = createClient();
            const result = await verifyCurrentPassword(supabase, email, currentPassword);
            if (!result.ok) {
                setError(result.message);
                return;
            }
            setPhase("new");
            setCurrentPassword("");
        } finally {
            setLoading(false);
        }
    };

    const onSaveNew = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const strength = validateNewPasswordStrength(newPassword);
        if (strength) {
            setError(strength);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("La nueva contraseña y la confirmación no coinciden.");
            return;
        }
        setLoading(true);
        try {
            const supabase = createClient();
            const { error: updErr } = await updateSessionPassword(supabase, newPassword);
            if (updErr) {
                setError(updErr.message);
                return;
            }
            toast.success("Contraseña actualizada");
            resetAll();
        } finally {
            setLoading(false);
        }
    };

    if (!email.trim()) {
        return null;
    }

    if (phase === "idle") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Contraseña de acceso</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button type='button' variant='outline' onClick={() => setPhase("verify")}>
                        Cambiar contraseña
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (phase === "verify") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Verificar contraseña actual</CardTitle>
                    <CardDescription>
                        Primero comprobamos que seas vos. Si usás solo Google y nunca definiste contraseña, no podés usar este flujo: usá la
                        recuperación de contraseña desde el inicio de sesión o seguí entrando con Google.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={(e) => void onVerifyCurrent(e)} className='grid gap-4'>
                        <div className='grid gap-2'>
                            <Label htmlFor='pwd-current'>Contraseña actual</Label>
                            <Input
                                id='pwd-current'
                                type='password'
                                autoComplete='current-password'
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error ?
                            <p className='text-sm text-destructive'>{error}</p>
                        :   null}
                        <div className='flex flex-wrap gap-2'>
                            <Button type='button' variant='ghost' disabled={loading} onClick={resetAll}>
                                Cancelar
                            </Button>
                            <Button type='submit' disabled={loading}>
                                {loading ? "Comprobando…" : "Continuar"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nueva contraseña</CardTitle>
                <CardDescription>Elegí una contraseña de al menos {PASSWORD_MIN_LENGTH} caracteres.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={(e) => void onSaveNew(e)} className='grid gap-4'>
                    <div className='grid gap-2'>
                        <Label htmlFor='pwd-new'>Nueva contraseña</Label>
                        <Input
                            id='pwd-new'
                            type='password'
                            autoComplete='new-password'
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className='grid gap-2'>
                        <Label htmlFor='pwd-confirm'>Confirmar nueva contraseña</Label>
                        <Input
                            id='pwd-confirm'
                            type='password'
                            autoComplete='new-password'
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error ?
                        <p className='text-sm text-destructive'>{error}</p>
                    :   null}
                    <div className='flex flex-wrap gap-2'>
                        <Button type='button' variant='ghost' disabled={loading} onClick={resetAll}>
                            Cancelar
                        </Button>
                        <Button type='submit' disabled={loading}>
                            {loading ? "Guardando…" : "Guardar nueva contraseña"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
