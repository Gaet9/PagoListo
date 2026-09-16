import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

const resetPasswordForEmailMock = vi.fn();

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
    resetPasswordForEmailMock.mockResolvedValue({ error: null });
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
        redirectTo: expect.stringMatching(
          /\/auth\/callback\?next=%2Fauth%2Fupdate-password$/,
        ),
      },
    );

    expect(
      screen.getByText(/revisá tu correo si tenés cuenta/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/si existe una cuenta con ese correo/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/te enviamos instrucciones/i)).not.toBeInTheDocument();
  });
});
