import { describe, expect, it, vi } from "vitest";

import { listNegocioMiembros } from "@/lib/queries/negocio-usuarios";

function createChainMock(finalResult: unknown) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    returns: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.returns.mockResolvedValue(finalResult);
  return chain;
}

describe("listNegocioMiembros", () => {
  it("no embebe usuarios (evita filtrado RLS en el join de PostgREST)", async () => {
    const chain = createChainMock({ data: [], error: null });
    const client = { from: vi.fn(() => chain) };

    await listNegocioMiembros(client as never, "negocio-1");

    expect(client.from).toHaveBeenCalledWith("negocio_usuarios");
    expect(chain.select).toHaveBeenCalledWith("usuario_id, role");
    expect(chain.select).not.toHaveBeenCalledWith(expect.stringContaining("usuarios"));
  });
});
