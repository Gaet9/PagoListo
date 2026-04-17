import { describe, it, expect } from "vitest";

import { escapeIlikePattern } from "@/lib/queries/productos";

describe("escapeIlikePattern", () => {
  it("escapa caracteres especiales de ILIKE", () => {
    expect(escapeIlikePattern("50%")).toBe("50\\%");
    expect(escapeIlikePattern("a_b")).toBe("a\\_b");
    expect(escapeIlikePattern("x\\y")).toBe("x\\\\y");
  });
});
