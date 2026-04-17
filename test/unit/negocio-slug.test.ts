import { describe, expect, it } from "vitest";

import {
  buildNegocioSlug,
  resolveNegocioFromSlug,
  slugifyNombre,
} from "@/lib/negocio-slug";
import type { NegocioListItem } from "@/lib/types/negocio";

describe("negocio-slug", () => {
  it("slugifyNombre normaliza acentos y espacios", () => {
    expect(slugifyNombre("  Mi Kiosco  ")).toBe("mi-kiosco");
    expect(slugifyNombre("Café & Pan")).toBe("cafe-pan");
  });

  it("buildNegocioSlug usa solo el nombre si no hay colisión", () => {
    const a: NegocioListItem = {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      nombre: "Una Tienda",
      localizacion: null,
    };
    expect(buildNegocioSlug(a, [a])).toBe("una-tienda");
  });

  it("buildNegocioSlug añade sufijo del id si dos nombres slugifican igual", () => {
    const a: NegocioListItem = {
      id: "11111111-1111-1111-1111-111111111111",
      nombre: "Kiosco",
      localizacion: null,
    };
    const b: NegocioListItem = {
      id: "22222222-2222-2222-2222-222222222222",
      nombre: "KIOSCO",
      localizacion: null,
    };
    const todos = [a, b];
    expect(buildNegocioSlug(a, todos)).toBe("kiosco-11111111");
    expect(buildNegocioSlug(b, todos)).toBe("kiosco-22222222");
  });

  it("resolveNegocioFromSlug devuelve el negocio correcto", () => {
    const a: NegocioListItem = {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      nombre: "Solo",
      localizacion: null,
    };
    expect(resolveNegocioFromSlug("solo", [a])?.id).toBe(a.id);
  });

  it("resolveNegocioFromSlug devuelve null si no coincide", () => {
    const a: NegocioListItem = {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      nombre: "A",
      localizacion: null,
    };
    expect(resolveNegocioFromSlug("no-existe", [a])).toBeNull();
  });
});
