import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

function displayNameFromClaims(claims: Record<string, unknown>, nombreCompleto: string | null): string {
    if (nombreCompleto?.trim()) {
        return nombreCompleto.trim();
    }
    const email = claims.email;
    return typeof email === "string" ? email : "usuario";
}

export async function AuthButton() {
    const supabase = await createClient();

    const { data } = await supabase.auth.getClaims();
    const user = data?.claims as Record<string, unknown> | undefined;

    let nombreCompleto: string | null = null;
    const userId = typeof user?.sub === "string" ? user.sub : null;

    if (userId) {
        const { data: perfil } = await supabase.from("usuarios").select("nombre, apellido").eq("id", userId).maybeSingle();

        if (perfil) {
            const row = perfil as { nombre: string | null; apellido: string | null };
            nombreCompleto = [row.nombre, row.apellido].filter(Boolean).join(" ");
        }
    }

    return user ?
            <div className='flex items-center gap-4'>
                <span className="text-muted-foreground truncate max-w-auth-greet">
                    Hola, {displayNameFromClaims(user, nombreCompleto)}
                </span>
                <LogoutButton />
            </div>
        :   <div className='flex gap-2'>
                <Button asChild size='sm' variant='outline'>
                    <Link href='/auth/login'>Iniciar sesión</Link>
                </Button>
                <Button asChild size='sm' variant='default'>
                    <Link href='/auth/sign-up'>Registrarse</Link>
                </Button>
            </div>;
}
