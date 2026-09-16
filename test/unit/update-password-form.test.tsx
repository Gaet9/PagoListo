import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UpdatePasswordForm } from "@/components/update-password-form";
import {
  RECOVERY_EXCHANGE_REDIRECT_TIMEOUT_MS,
  RECOVERY_REDIRECT_FAILED_MESSAGE,
  RECOVERY_REDIRECTING_MESSAGE,
  RECOVERY_SESSION_MISSING_MESSAGE,
  RECOVERY_SESSION_VERIFY_TIMEOUT_MS,
} from "@/lib/auth/password-recovery";

const getSessionMock = vi.fn();
const getUserMock = vi.fn();
const updateUserMock = vi.fn();
const exchangeCodeForSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const replaceMock = vi.fn();

const pushMock = vi.fn();

function stubLocationWithReplaceMock() {
  const { search, pathname, href } = window.location;
  vi.stubGlobal("location", {
    ...window.location,
    origin: "https://www.pagolisto.com.ar",
    href: href.includes("://")
      ? href
      : `https://www.pagolisto.com.ar${pathname}${search}`,
    search,
    pathname,
    replace: replaceMock,
    assign: vi.fn(),
    reload: vi.fn(),
  });
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      getUser: (...args: unknown[]) => getUserMock(...args),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
      exchangeCodeForSession: (...args: unknown[]) =>
        exchangeCodeForSessionMock(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
    },
  }),
}));

describe("UpdatePasswordForm", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getUserMock.mockReset();
    updateUserMock.mockReset();
    exchangeCodeForSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    replaceMock.mockReset();
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    window.history.replaceState({}, "", "/auth/update-password");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("muestra error si no hay sesión de recuperación", async () => {
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

  it("habilita el formulario cuando getSession trae sesión aunque getUser no", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    render(<UpdatePasswordForm />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /guardar contraseña/i }),
      ).not.toBeDisabled();
    });

    expect(getSessionMock).toHaveBeenCalled();
  });

  it("actualiza la contraseña cuando hay sesión", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
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

  it("intercambia el code en el cliente y habilita el formulario sin redirigir", async () => {
    window.history.replaceState(
      {},
      "",
      "/auth/update-password?code=recovery-code",
    );
    stubLocationWithReplaceMock();
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    render(<UpdatePasswordForm />);

    await waitFor(() => {
      expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("recovery-code");
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /guardar contraseña/i }),
      ).not.toBeDisabled();
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("muestra redirección y enlace manual cuando hay code pero el intercambio falla", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.history.replaceState(
      {},
      "",
      "/auth/update-password?code=bad-code",
    );
    stubLocationWithReplaceMock();
    exchangeCodeForSessionMock.mockResolvedValue({
      error: new Error("invalid"),
    });

    render(<UpdatePasswordForm />);

    await waitFor(() => {
      expect(screen.getByText(RECOVERY_REDIRECTING_MESSAGE)).toBeInTheDocument();
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/auth/callback?code=bad-code&next=%2Fauth%2Fupdate-password",
    );

    expect(
      screen.getByRole("link", { name: /continuar manualmente/i }),
    ).toHaveAttribute(
      "href",
      "https://www.pagolisto.com.ar/auth/callback?code=bad-code&next=%2Fauth%2Fupdate-password",
    );

    await vi.advanceTimersByTimeAsync(RECOVERY_EXCHANGE_REDIRECT_TIMEOUT_MS);

    await waitFor(() => {
      expect(screen.getByText(RECOVERY_REDIRECT_FAILED_MESSAGE)).toBeInTheDocument();
    });
  });

  it("deja de verificar tras timeout duro si la sesión nunca resuelve", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getSessionMock.mockImplementation(() => new Promise(() => {}));
    getUserMock.mockImplementation(() => new Promise(() => {}));

    render(<UpdatePasswordForm />);

    expect(screen.getByText(/verificando tu enlace/i)).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(RECOVERY_SESSION_VERIFY_TIMEOUT_MS);

    await waitFor(() => {
      expect(screen.getByText(RECOVERY_SESSION_MISSING_MESSAGE)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /pedir un enlace nuevo/i }),
    ).toHaveAttribute("href", "/auth/forgot-password");
  });
});
