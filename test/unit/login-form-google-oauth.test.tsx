import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { LoginForm } from "@/components/login-form";

const startGoogleOAuthSignIn = vi.fn();

vi.mock("@/lib/auth/start-google-oauth", () => ({
  startGoogleOAuthSignIn: (...args: unknown[]) => startGoogleOAuthSignIn(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword: vi.fn() } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("LoginForm Google OAuth", () => {
  beforeEach(() => {
    startGoogleOAuthSignIn.mockReset();
    startGoogleOAuthSignIn.mockResolvedValue({ ok: true });
  });

  it("inicia Google una sola vez y deshabilita el botón", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const button = screen.getByRole("button", { name: /continuar con google/i });
    await user.click(button);
    await user.click(button);

    expect(startGoogleOAuthSignIn).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });
});
