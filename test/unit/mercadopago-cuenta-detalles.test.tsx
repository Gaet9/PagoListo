import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MercadoPagoCuentaDetalles } from "@/components/tienda/mercadopago-cuenta-detalles";

describe("MercadoPagoCuentaDetalles", () => {
    it("muestra ID y email", () => {
        render(
            <MercadoPagoCuentaDetalles
                status={{
                    connected: true,
                    mp_user_id: 12345,
                    account_email: "a@b.com",
                }}
            />,
        );
        expect(screen.getByText(/12345/)).toBeInTheDocument();
        expect(screen.getByText("a@b.com")).toBeInTheDocument();
    });
});
