/** Máximo por línea / producto en un cobro POS (entero positivo). */
export const MAX_COBRO_LINE_QUANTITY = 9999;

export function parsePositiveIntQuantity(
  raw: unknown,
  fieldLabel: string,
): { ok: true; qty: number } | { ok: false; error: string } {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return { ok: false, error: `${fieldLabel}: la cantidad debe ser un entero positivo` };
  }
  if (!Number.isInteger(raw) || raw <= 0) {
    return { ok: false, error: `${fieldLabel}: la cantidad debe ser un entero positivo` };
  }
  if (raw > MAX_COBRO_LINE_QUANTITY) {
    return { ok: false, error: `${fieldLabel}: la cantidad máxima es ${MAX_COBRO_LINE_QUANTITY}` };
  }
  return { ok: true, qty: raw };
}

export type CobroLineQuantityInput = {
  id?: string;
  quantity?: number;
};

export function buildCobroQuantityByProduct(
  rawItems: CobroLineQuantityInput[],
): { ok: true; qtyByProduct: Map<string, number> } | { ok: false; error: string; status: number } {
  if (!rawItems.length) {
    return { ok: false, error: "El carrito debe tener al menos un producto", status: 400 };
  }

  const qtyByProduct = new Map<string, number>();
  for (const [i, item] of rawItems.entries()) {
    const productoId = item.id?.trim();
    if (!productoId) {
      return { ok: false, error: `Falta el producto en la línea ${i + 1}`, status: 400 };
    }
    const parsed = parsePositiveIntQuantity(item.quantity, `items[${i}].quantity`);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, status: 400 };
    }
    const next = (qtyByProduct.get(productoId) ?? 0) + parsed.qty;
    if (next > MAX_COBRO_LINE_QUANTITY) {
      return {
        ok: false,
        error: `La cantidad total del producto supera el máximo (${MAX_COBRO_LINE_QUANTITY})`,
        status: 400,
      };
    }
    qtyByProduct.set(productoId, next);
  }

  return { ok: true, qtyByProduct };
}
