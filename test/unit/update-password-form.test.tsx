import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UpdatePasswordForm } from "@/components/update-password-form";

const getUserMock = vi.fn();
const updateUserMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const exchangeCodeForSessionMock = vi.fn();

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      exchangeCodeForSession: (...args: unknown[]) =>
        exchangeCodeForSessionMock(...args),
      verifyOtp: vi.fn(),
      setSession: vi.fn(),
    },
  }),
}));

describe("UpdatePasswordForm", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    updateUserMock.mockReset();
    onAuthStateChangeMock.mockReset();
    exchangeCodeForSessionMock.mockReset();
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    window.history.replaceState({}, "", "/auth/update-password");
  });

  it("muestra error si no hay sesión de recuperación", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    render(<UpdatePasswordForm />);

    await waitFor(() => {
      expect(
        screen.getByText(/no hay una sesión de recuperación activa/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /guardar contraseña/i }),
    ).toBeDisabled();
  });

  it("establece sesión desde code en la URL y habilita el formulario", async () => {
    window.history.replaceState(
      {},
      "",
      "/auth/update-password?code=from-email",
    );
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    render(<UpdatePasswordForm />);

    await waitFor(() => {
      expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("from-email");
      expect(
        screen.getByRole("button", { name: /guardar contraseña/i }),
      ).not.toBeDisabled();
    });
  });

  it("actualiza la contraseña cuando hay sesión", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    updateUserMock.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    render(<UpdatePasswordForm />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /guardar contraseña/i }),
      ).not.toBeDisabled();
    });

    await user.type(screen.getByLabelText(/nueva contraseña/i), "unit-test-pw-value");
    await user.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    expect(updateUserMock).toHaveBeenCalledWith({ password: "unit-test-pw-value" });
  });
});
