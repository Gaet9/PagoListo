import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { TiendasSeleccionCards } from "@/components/tienda/tiendas-seleccion-cards";
import type { NegocioListItem } from "@/lib/types/negocio";

describe("TiendasSeleccionCards", () => {
  it("renderiza enlaces con nombre y localización", () => {
    const negocios: NegocioListItem[] = [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        nombre: "Kiosco Norte",
        localizacion: "Rosario",
      },
      {
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        nombre: "Almacén Sur",
        localizacion: null,
      },
    ];

    render(<TiendasSeleccionCards negocios={negocios} />);

    const kiosco = screen.getByRole("link", { name: /Kiosco Norte/i });
    expect(kiosco).toHaveAttribute("href", "/tiendas/kiosco-norte");
    expect(kiosco.textContent).toMatch(/Rosario/);

    const almacen = screen.getByRole("link", { name: /Almacén Sur/i });
    expect(almacen).toHaveAttribute("href", "/tiendas/almacen-sur");
    expect(almacen.textContent).toMatch(/Sin ubicación/);
  });
});
