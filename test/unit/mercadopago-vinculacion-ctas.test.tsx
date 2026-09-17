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
    });

    it("desvinculada: Conectar con Mercado Pago llama onConnect", () => {
        const onConnect = vi.fn();
        render(
            <MercadoPagoVinculacionCtas
                negocioId='n1'
                connected={false}
                onConnect={onConnect}
                onUnlinked={() => {}}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /Conectar con Mercado Pago/i }));
        expect(onConnect).toHaveBeenCalledOnce();
    });

    it("desvinculada tras unlink: etiqueta Vincular", () => {
        render(
            <MercadoPagoVinculacionCtas
                negocioId='n1'
                connected={false}
                vincularLabel
                onConnect={() => {}}
                onUnlinked={() => {}}
            />,
        );

        expect(screen.getByRole("button", { name: /^Vincular$/i })).toBeInTheDocument();
    });
});
