import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

const resetPasswordForEmailMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (...args: unknown[]) => replaceMock(...args),
  }),
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

  it("muestra éxito cuando sentFromUrl es true sin enviar el formulario", () => {
    render(<ForgotPasswordForm sentFromUrl />);

    expect(
      screen.getByText(/revisá tu correo si tenés cuenta/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /enviar correo/i }),
    ).not.toBeInTheDocument();
  });
});
