import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  subscriptionAllowsCancel,
  subscriptionAllowsCheckout,
  SuscripcionEstadoResumen,
} from "@/components/perfil/suscripcion-estado-resumen";

describe("SuscripcionEstadoResumen", () => {
  it("shows active plan and renewal", () => {
    render(
      <SuscripcionEstadoResumen
        enforcementEnabled
        row={{
          status: "active",
          plan_code: "mensual",
          current_period_end: "2099-01-01T12:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByText(/Activo/)).toBeInTheDocument();
    expect(screen.getByText(/Abono mensual/)).toBeInTheDocument();
  });

  it("shows canceled with access until end", () => {
    render(
      <SuscripcionEstadoResumen
        enforcementEnabled
        row={{
          status: "canceled",
          plan_code: "mensual",
          current_period_end: "2099-06-01T12:00:00.000Z",
          canceled_at: "2026-06-01T12:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByText(/Acceso hasta/)).toBeInTheDocument();
    expect(screen.getAllByText(/Cancelada/).length).toBeGreaterThan(0);
  });
});

describe("subscription action helpers", () => {
  it("allows cancel only for active phase", () => {
    expect(
      subscriptionAllowsCancel({
        status: "active",
        current_period_end: "2099-01-01T00:00:00.000Z",
        plan_code: "mensual",
      }),
    ).toBe(true);
    expect(
      subscriptionAllowsCancel({
        status: "canceled",
        current_period_end: "2099-01-01T00:00:00.000Z",
        plan_code: "mensual",
      }),
    ).toBe(false);
  });

  it("allows checkout when unpaid or expired", () => {
    expect(subscriptionAllowsCheckout(null)).toBe(true);
    expect(
      subscriptionAllowsCheckout({
        status: "active",
        current_period_end: "2020-01-01T00:00:00.000Z",
        plan_code: "mensual",
      }),
    ).toBe(true);
    expect(
      subscriptionAllowsCheckout({
        status: "active",
        current_period_end: "2099-01-01T00:00:00.000Z",
        plan_code: "mensual",
      }),
    ).toBe(false);
  });
});
