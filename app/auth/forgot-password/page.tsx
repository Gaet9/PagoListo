import { ForgotPasswordForm } from "@/components/forgot-password-form";
import {
  FORGOT_PASSWORD_SENT_SEARCH_PARAM,
  forgotPasswordSentFromSearchParam,
} from "@/lib/auth/forgot-password-sent-state";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sentFromUrl = forgotPasswordSentFromSearchParam(
    params[FORGOT_PASSWORD_SENT_SEARCH_PARAM],
  );

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm sentFromUrl={sentFromUrl} />
      </div>
    </div>
  );
}
