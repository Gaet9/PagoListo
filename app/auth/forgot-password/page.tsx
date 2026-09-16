import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";

<<<<<<< HEAD
async function ForgotPasswordPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sentFromUrl = forgotPasswordSentFromSearchParam(
    params[FORGOT_PASSWORD_SENT_SEARCH_PARAM],
=======
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
>>>>>>> 98d01a8 (fix(GAE-28): Suspense boundary for forgot-password search params)
  );
}

<<<<<<< HEAD
  return <ForgotPasswordForm sentFromUrl={sentFromUrl} />;
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<ForgotPasswordForm />}>
          <ForgotPasswordPageContent searchParams={searchParams} />
=======
export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<ForgotPasswordFormFallback />}>
          <ForgotPasswordForm />
>>>>>>> 98d01a8 (fix(GAE-28): Suspense boundary for forgot-password search params)
        </Suspense>
      </div>
    </div>
  );
}
