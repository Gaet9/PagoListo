import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

const resetPasswordForEmailMock = vi.fn();
const replaceMock = vi.fn();
const useSearchParamsMock = vi.fn(
  () => new URLSearchParams() as ReturnType<typeof import("next/navigation").useSearchParams>,
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (...args: unknown[]) => replaceMock(...args),
  }),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: (...args: unknown[]) =>
        resetPasswordForEmailMock(...args),
    },
  }),
}));

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    resetPasswordForEmailMock.mockReset();
    replaceMock.mockReset();
    useSearchParamsMock.mockReset();
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams() as ReturnType<
        typeof import("next/navigation").useSearchParams
      >,
    );
    resetPasswordForEmailMock.mockResolvedValue({ error: null });
    sessionStorage.clear();
  });

  it("muestra copy condicional en éxito sin afirmar que se envió el correo", async () => {
    const user = userEvent.setup();

    render(<ForgotPasswordForm />);

    await user.type(
      screen.getByLabelText(/correo electrónico/i),
      "usuario@ejemplo.com",
    );
    await user.click(screen.getByRole("button", { name: /enviar correo/i }));

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
      "usuario@ejemplo.com",
      {
        redirectTo: expect.stringMatching(/\/auth\/update-password$/),
      },
    );

    expect(
      screen.getByText(/revisá tu correo si tenés cuenta/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/si existe una cuenta con ese correo/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/te enviamos instrucciones/i)).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith(
      "/auth/forgot-password?sent=1",
      { scroll: false },
    );
    expect(sessionStorage.getItem("pagolisto:forgot-password-sent")).toBe("1");
  });

  it("muestra éxito cuando la URL tiene sent=1 sin enviar el formulario", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("sent=1") as ReturnType<
        typeof import("next/navigation").useSearchParams
      >,
    );

    render(<ForgotPasswordForm />);

    expect(
      screen.getByText(/revisá tu correo si tenés cuenta/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /enviar correo/i }),
    ).not.toBeInTheDocument();
  });
});
