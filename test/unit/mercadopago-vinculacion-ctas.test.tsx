import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MercadoPagoVinculacionCtas } from "@/components/tienda/mercadopago-vinculacion-ctas";

describe("MercadoPagoVinculacionCtas", () => {
    it("vinculada: solo Desvincular", () => {
        render(
            <MercadoPagoVinculacionCtas
                negocioId='n1'
                connected
                onConnect={() => {}}
                onUnlinked={() => {}}
            />,
        );

        expect(screen.getByRole("button", { name: /Desvincular/i })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Vincular otra cuenta/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /^Vincular$/i })).not.toBeInTheDocument();
    });

    it("desvinculada: Vincular llama onConnect", () => {
        const onConnect = vi.fn();
        render(
            <MercadoPagoVinculacionCtas
                negocioId='n1'
                connected={false}
                onConnect={onConnect}
                onUnlinked={() => {}}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /^Vincular$/i }));
        expect(onConnect).toHaveBeenCalledOnce();
    });
});
