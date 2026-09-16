"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getForgotPasswordErrorMessage } from "@/lib/auth/forgot-password-error-message";
import {
  FORGOT_PASSWORD_SENT_SEARCH_PARAM,
  forgotPasswordSentFromSearchParam,
  markForgotPasswordEmailRequested,
  readForgotPasswordEmailRequestedFromSession,
} from "@/lib/auth/forgot-password-sent-state";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sentFromUrl = forgotPasswordSentFromSearchParam(
    searchParams.get(FORGOT_PASSWORD_SENT_SEARCH_PARAM) ?? undefined,
  );
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(sentFromUrl);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sentFromUrl) return;
    if (!readForgotPasswordEmailRequestedFromSession()) return;
    setSuccess(true);
    router.replace(
      `/auth/forgot-password?${FORGOT_PASSWORD_SENT_SEARCH_PARAM}=1`,
      { scroll: false },
    );
  }, [router, sentFromUrl]);

  const showSuccess = success || sentFromUrl;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      markForgotPasswordEmailRequested();
      setSuccess(true);
      router.replace(
        `/auth/forgot-password?${FORGOT_PASSWORD_SENT_SEARCH_PARAM}=1`,
        { scroll: false },
      );
    } catch (error: unknown) {
      setError(getForgotPasswordErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {showSuccess ? (
        <Card>
          <CardHeader>
            <CardTitle>Revisá tu correo si tenés cuenta</CardTitle>
            <CardDescription>
              Si existe una cuenta con ese correo, vas a recibir instrucciones
              para restablecer la contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Revisá la bandeja de entrada y el correo no deseado. Si te
              registraste con correo y contraseña, el enlace te permite elegir
              una contraseña nueva.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Restablecer contraseña</CardTitle>
            <CardDescription>
              Escribe tu correo y te enviaremos un enlace para restablecerla
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Enviando…" : "Enviar correo"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                ¿Ya tienes cuenta?{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Iniciar sesión
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
