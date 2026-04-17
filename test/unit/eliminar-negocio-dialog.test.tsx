import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EliminarNegocioDialog } from "@/components/perfil/eliminar-negocio-dialog";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({}),
}));

const deleteNegocioByIdMock = vi.fn();

vi.mock("@/lib/queries/negocios", () => ({
    deleteNegocioById: (...args: unknown[]) => deleteNegocioByIdMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("sonner", () => ({
    toast: {
        success: (...a: unknown[]) => toastSuccess(...a),
        error: (...a: unknown[]) => toastError(...a),
    },
}));

describe("EliminarNegocioDialog", () => {
    beforeEach(() => {
        refreshMock.mockClear();
        deleteNegocioByIdMock.mockReset();
        toastSuccess.mockClear();
        toastError.mockClear();
    });

    it("muestra advertencia de irreversibilidad y llama al borrado al confirmar", async () => {
        deleteNegocioByIdMock.mockResolvedValue({ error: null });
        const user = userEvent.setup();

        render(<EliminarNegocioDialog negocioId='n1' negocioNombre='Mi kiosco' />);

        await user.click(screen.getByRole("button", { name: "Eliminar tienda" }));
        expect(screen.getByText(/irreversible/i)).toBeInTheDocument();
        expect(screen.getByText("Mi kiosco")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Eliminar para siempre" }));

        expect(deleteNegocioByIdMock).toHaveBeenCalledWith(expect.anything(), "n1");
        expect(toastSuccess).toHaveBeenCalledWith("Tienda eliminada");
        expect(refreshMock).toHaveBeenCalled();
    });

    it("muestra error si falla el borrado", async () => {
        deleteNegocioByIdMock.mockResolvedValue({ error: { message: "RLS" } });
        const user = userEvent.setup();

        render(<EliminarNegocioDialog negocioId='n1' negocioNombre='X' />);

        await user.click(screen.getByRole("button", { name: "Eliminar tienda" }));
        await user.click(screen.getByRole("button", { name: "Eliminar para siempre" }));

        expect(toastError).toHaveBeenCalled();
        expect(refreshMock).not.toHaveBeenCalled();
    });
});
