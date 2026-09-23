/**
 * Fecha/hora como en la lista de Ventas (`ventas-tab`): dd/MM/yy HH:mm (es-AR + hora 24h).
 */
export function formatVentaDateTimeAr(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    const fechaCorta = date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    });
    const hora = date.toLocaleTimeString("es-FR", {
        hour: "2-digit",
        minute: "2-digit",
    });
    return `${fechaCorta} ${hora}`;
}
