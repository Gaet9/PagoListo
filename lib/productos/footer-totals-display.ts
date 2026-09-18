import type { ProductosTotals } from "@/lib/queries/productos";

/**
 * Comportamiento del pie en `17ee6a4` (#43): si `totalsWhileEditing` es null durante
 * edición, el pie sigue el estado `totals` en vivo (p. ej. fetch inicial o búsqueda) sin PATCH.
 */
export function resolveFooterTotalsLegacy17ee6a4(
    editingRowId: string | null,
    totalsWhileEditing: ProductosTotals | null,
    liveTotals: ProductosTotals | null,
): ProductosTotals | null {
    if (editingRowId !== null) {
        return totalsWhileEditing ?? liveTotals;
    }
    return liveTotals;
}

/** Pie congelado: en edición solo el snapshot; nunca el borrador ni `totals` en vivo. */
export function resolveFooterTotalsFrozen(
    editingRowId: string | null,
    frozenFooterTotals: ProductosTotals | null,
    liveTotals: ProductosTotals | null,
): ProductosTotals | null {
    if (editingRowId !== null) {
        return frozenFooterTotals;
    }
    return liveTotals;
}

export function cloneProductosTotals(t: ProductosTotals): ProductosTotals {
    return {
        lineCount: t.lineCount,
        stockTotal: t.stockTotal,
        sumPrecioCompra: t.sumPrecioCompra,
        sumPrecioVenta: t.sumPrecioVenta,
    };
}
