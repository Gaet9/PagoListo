import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MercadoPagoEstadoBadge } from "@/components/tienda/mercadopago-estado-badge";

describe("MercadoPagoEstadoBadge", () => {
    it("muestra Vinculada y Desvinculada", () => {
        const { rerender } = render(<MercadoPagoEstadoBadge connected={true} />);
        expect(screen.getByText("Vinculada")).toBeInTheDocument();
        rerender(<MercadoPagoEstadoBadge connected={false} />);
        expect(screen.getByText("Desvinculada")).toBeInTheDocument();
    });
});
