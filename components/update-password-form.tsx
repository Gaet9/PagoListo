"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  RECOVERY_SESSION_EXPIRED_MESSAGE,
  RECOVERY_SESSION_MISSING_MESSAGE,
} from "@/lib/auth/password-recovery";
import {
  RECOVERY_SESSION_VERIFY_TIMEOUT_MS,
  resolveUpdatePasswordSession,
  sessionHasUser,
  stripRecoveryParamsFromUrl,
} from "@/lib/auth/update-password-session";
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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionStatus = "loading" | "ready" | "error";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("loading");
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let resolved = false;
    const supabase = createClient();

    const markReady = () => {
      if (cancelled) return;
      resolved = true;
      stripRecoveryParamsFromUrl();
      setSessionStatus("ready");
      setSessionMessage(null);
    };

    const markError = (message: string) => {
      if (cancelled) return;
      resolved = true;
      setSessionStatus("error");
      setSessionMessage(message);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (cancelled) return;
        if (
          (event === "SIGNED_IN" ||
            event === "PASSWORD_RECOVERY" ||
            event === "TOKEN_REFRESHED") &&
          sessionHasUser(session)
        ) {
          markReady();
        }
      },
    );

    const verifyTimeout = window.setTimeout(() => {
      if (cancelled || resolved) return;
      markError(RECOVERY_SESSION_EXPIRED_MESSAGE);
    }, RECOVERY_SESSION_VERIFY_TIMEOUT_MS);

    void (async () => {
      try {
        const resolution = await resolveUpdatePasswordSession(
          supabase,
          window.location,
        );

        if (cancelled) return;

        if (resolution.kind === "redirect") {
          window.location.replace(resolution.path);
          return;
        }

        if (resolution.kind === "ready") {
          markReady();
          return;
        }

        markError(resolution.message);
      } catch {
        if (!cancelled) {
          markError(RECOVERY_SESSION_MISSING_MESSAGE);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(verifyTimeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionStatus !== "ready") {
      setError(sessionMessage ?? RECOVERY_SESSION_MISSING_MESSAGE);
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error(RECOVERY_SESSION_MISSING_MESSAGE);
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/perfil");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error");
    } finally {
      setIsLoading(false);
    }
  };

  const formDisabled = sessionStatus !== "ready" || isLoading;
  const showSessionBlock = sessionStatus === "loading" || sessionStatus === "error";

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Nueva contraseña</CardTitle>
          <CardDescription>
            Elige una contraseña nueva para tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionStatus === "loading" ? (
            <p className="text-sm text-muted-foreground">
              Verificando tu enlace de recuperación…
            </p>
          ) : null}
          {sessionStatus === "error" && sessionMessage ? (
            <div className="mb-4 space-y-3">
              <p className="text-sm text-red-500">{sessionMessage}</p>
              <Link
                href="/auth/forgot-password"
                className="text-sm underline underline-offset-4"
              >
                Pedir un enlace nuevo
              </Link>
            </div>
          ) : null}
          <form onSubmit={handleUpdatePassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nueva contraseña"
                  required
                  value={password}
                  disabled={formDisabled}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={formDisabled || showSessionBlock}
              >
                {isLoading ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
