import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ForgotPasswordFormFallback() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Restablecer contraseña</CardTitle>
          <CardDescription>Cargando…</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Un momento, por favor.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<ForgotPasswordFormFallback />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
