import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { ComprobantePagoPdfButton } from "@/components/mercadopago/comprobante-pago-pdf-button";

vi.mock("@/components/mercadopago/descargar-comprobante-pago-button", () => ({
    DescargarComprobantePagoButton: (props: { intentoId?: string | null; paymentId?: string | null }) => (
        <button type="button">
            Descargar mock {props.intentoId}-{props.paymentId}
        </button>
    ),
}));

describe("ComprobantePagoPdfButton", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("no renderiza sin referencia de cobro", () => {
        const { container } = render(<ComprobantePagoPdfButton searchParams={{ status: "approved" }} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("mapea external_reference y payment_id del retorno MP", () => {
        render(
            <ComprobantePagoPdfButton
                searchParams={{
                    status: "approved",
                    external_reference: "int-abc",
                    payment_id: "999",
                }}
            />,
        );
        expect(screen.getByRole("button", { name: /Descargar mock int-abc-999/i })).toBeInTheDocument();
    });
});
