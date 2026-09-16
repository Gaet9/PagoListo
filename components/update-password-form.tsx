"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getRecoverySessionExchangePath,
  hasImplicitRecoveryHash,
  PASSWORD_RECOVERY_UPDATE_PATH,
  RECOVERY_EXCHANGE_REDIRECT_TIMEOUT_MS,
  RECOVERY_REDIRECT_FAILED_MESSAGE,
  RECOVERY_REDIRECTING_MESSAGE,
  RECOVERY_SESSION_EXPIRED_MESSAGE,
  RECOVERY_SESSION_MISSING_MESSAGE,
  RECOVERY_VERIFYING_MESSAGE,
} from "@/lib/auth/password-recovery";
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

type SessionStatus = "loading" | "redirecting" | "ready" | "error";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("loading");
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [manualExchangeHref, setManualExchangeHref] = useState<string | null>(
    null,
  );
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const searchParams = new URLSearchParams(window.location.search);
    const exchangePath = getRecoverySessionExchangePath(searchParams);
    const recoveryCode = searchParams.get("code");

    const resolveSession = async (): Promise<boolean> => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return false;
      if (!cancelled) {
        setSessionStatus("ready");
        setSessionMessage(null);
        setManualExchangeHref(null);
      }
      return true;
    };

    const failSession = (message: string) => {
      if (cancelled) return;
      setSessionStatus("error");
      setSessionMessage(message);
    };

    const waitForRedirectOrTimeout = (path: string) => {
      setSessionStatus("redirecting");
      setManualExchangeHref(`${window.location.origin}${path}`);
      window.location.replace(path);
      return new Promise<void>((resolve) => {
        window.setTimeout(() => {
          if (!cancelled) {
            failSession(RECOVERY_REDIRECT_FAILED_MESSAGE);
          }
          resolve();
        }, RECOVERY_EXCHANGE_REDIRECT_TIMEOUT_MS);
      });
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (
          event === "SIGNED_IN" ||
          event === "PASSWORD_RECOVERY" ||
          event === "TOKEN_REFRESHED"
        ) {
          await resolveSession();
        }
      },
    );

    void (async () => {
      if (recoveryCode) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(recoveryCode);
        if (!cancelled && !exchangeError && (await resolveSession())) {
          window.history.replaceState({}, "", PASSWORD_RECOVERY_UPDATE_PATH);
          return;
        }
      }

      if (exchangePath) {
        await waitForRedirectOrTimeout(exchangePath);
        return;
      }

      if (await resolveSession()) return;

      const waitingForHash = hasImplicitRecoveryHash(window.location.hash);

      if (waitingForHash) {
        for (let attempt = 0; attempt < 30; attempt += 1) {
          if (cancelled) return;
          if (await resolveSession()) return;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        failSession(RECOVERY_SESSION_EXPIRED_MESSAGE);
        return;
      }

      const hasSession = await resolveSession();
      if (!hasSession && !cancelled) {
        failSession(RECOVERY_SESSION_MISSING_MESSAGE);
      }
    })();

    return () => {
      cancelled = true;
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
  const showSessionBlock =
    sessionStatus === "loading" ||
    sessionStatus === "redirecting" ||
    sessionStatus === "error";

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
              {RECOVERY_VERIFYING_MESSAGE}
            </p>
          ) : null}
          {sessionStatus === "redirecting" ? (
            <div className="mb-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {RECOVERY_REDIRECTING_MESSAGE}
              </p>
              {manualExchangeHref ? (
                <a
                  href={manualExchangeHref}
                  className="text-sm underline underline-offset-4"
                >
                  Continuar manualmente
                </a>
              ) : null}
            </div>
          ) : null}
          {sessionStatus === "error" && sessionMessage ? (
            <div className="mb-4 space-y-3">
              <p className="text-sm text-red-500">{sessionMessage}</p>
              {manualExchangeHref ? (
                <a
                  href={manualExchangeHref}
                  className="block text-sm underline underline-offset-4"
                >
                  Continuar manualmente
                </a>
              ) : null}
              <Link
                href="/auth/forgot-password"
                className="block text-sm underline underline-offset-4"
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
