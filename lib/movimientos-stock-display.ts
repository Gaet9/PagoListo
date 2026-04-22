/**
 * Textos de UI para filas de `movimientos_stock`.
 * En BD los motivos canónicos son `compra`, `venta`, `ajuste` (minúsculas).
 */

function stripDiacritics(s: string) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Convierte `motivo` guardado en BD a etiqueta de operación en pantalla. */
export function labelOperacionDesdeMotivo(raw: string): string {
    const k = stripDiacritics(raw.trim().toLowerCase());
    if (!k) return raw.trim();
    if (k.includes("reposicion")) return "Compra";
    if (k === "compra") return "Compra";
    if (k === "venta") return "Venta";
    if (k === "ajuste") return "Ajuste";
    if (k === "salida") return "Ajuste";
    return raw.trim();
}

export function operacionMovimientoStock(m: {
    tipo: string;
    motivo?: string | null;
    venta_id?: string | null;
    compra_id?: string | null;
}): string {
    const fromDb = typeof m.motivo === "string" ? m.motivo.trim() : "";
    if (fromDb) return labelOperacionDesdeMotivo(fromDb);
    if (m.tipo === "in") return "Compra";
    if (m.tipo === "out") return m.venta_id ? "Venta" : "Ajuste";
    if (m.tipo === "ajuste") return "Ajuste";
    return m.tipo;
}
