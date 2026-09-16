import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import {
  FORGOT_PASSWORD_SENT_SEARCH_PARAM,
  forgotPasswordSentFromSearchParam,
} from "@/lib/auth/forgot-password-sent-state";

async function ForgotPasswordPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sentFromUrl = forgotPasswordSentFromSearchParam(
    params[FORGOT_PASSWORD_SENT_SEARCH_PARAM],
  );

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
        </Suspense>
      </div>
    </div>
  );
}
