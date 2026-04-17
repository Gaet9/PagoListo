import type { SupabaseClient } from "@supabase/supabase-js";

import type { MovimientoStockRow } from "@/lib/types/negocio";
import type { KeysetCursor } from "@/lib/types/pagination";

export const MOVIMIENTOS_STOCK_PAGE_SIZE = 10;

export type MovimientoStockTipo = "in" | "out" | "ajuste";
export type InsertMovimientoStockInput = {
    producto_id: string;
    tipo: MovimientoStockTipo;
    cantidad: number;
    precio_unitario?: number | null;
    venta_id?: string | null;
    compra_id?: string | null;
    stock_anterior?: number | null;
    stock_nuevo?: number | null;
    venta_item_id?: string | null;
    compra_item_id?: string | null;
};

/** Inserta una fila en `movimientos_stock` (requiere tabla + políticas RLS en Supabase). */
export async function insertMovimientoStock(client: SupabaseClient, input: InsertMovimientoStockInput) {
    const qty = Math.abs(Math.trunc(input.cantidad));
    if (qty === 0) {
        return { data: null, error: null };
    }
    const row: Record<string, unknown> = {
        producto_id: input.producto_id,
        tipo: input.tipo,
        cantidad: qty,
    };
    if (input.precio_unitario != null && Number.isFinite(input.precio_unitario)) {
        row.precio_unitario = input.precio_unitario;
    }
    if (input.venta_id) row.venta_id = input.venta_id;
    if (input.compra_id) row.compra_id = input.compra_id;
    if (input.stock_anterior != null) row.stock_anterior = input.stock_anterior;
    if (input.stock_nuevo != null) row.stock_nuevo = input.stock_nuevo;
    if (input.venta_item_id) row.venta_item_id = input.venta_item_id;
    if (input.compra_item_id) row.compra_item_id = input.compra_item_id;
    return await client.from("movimientos_stock").insert(row as never);
}

/**
 * Registra solo salidas por ajuste manual de `stock_actual` desde la UI de productos (stock que baja).
 * Si el stock sube, usá `insertCompraReposicion` (compra_items → movimientos_stock en la BD).
 * Las ventas en caja generan `venta_items`; el trigger en BD (ver migración
 * `20260418150000_fix_venta_items_movimiento_stock_snapshot.sql`) descuenta
 * `productos.stock_actual` y escribe `movimientos_stock` con `stock_anterior` /
 * `stock_nuevo` en el mismo bloque (evita desfases por orden de triggers).
 */
export type RecordProductoStockMovementOpts = {
    /** Para entradas (reposición): precio de compra unitario de referencia. */
    precioCompra?: number;
    /** Para salidas (ajuste manual desde productos): precio de venta unitario de referencia. */
    precioVenta?: number;
};

export async function recordProductoStockMovement(
    client: SupabaseClient,
    productoId: string,
    prevStock: number,
    newStock: number,
    opts?: RecordProductoStockMovementOpts,
) {
    const prev = Math.max(0, Math.trunc(Number(prevStock)));
    const next = Math.max(0, Math.trunc(Number(newStock)));
    if (prev === next) {
        return { data: null, error: null };
    }
    const delta = next - prev;
    if (delta > 0) {
        return { data: null, error: null };
    }
    const pv = opts?.precioVenta;
    return await insertMovimientoStock(client, {
        producto_id: productoId,
        tipo: "out",
        cantidad: -delta,
        precio_unitario: pv != null && Number.isFinite(pv) && pv >= 0 ? pv : null,
        stock_anterior: prev,
        stock_nuevo: next,
    });
}

export type ListMovimientosStockPageOpts = {
    limit?: number;
    cursor?: KeysetCursor | null;
    /** Solo movimientos de este producto (debe pertenecer al negocio). */
    productoId?: string | null;
    /** Filtra por nombre o código de barras del producto (ILIKE). Ignorado si `productoId` está definido. */
    search?: string | null;
};

function escapeIlikePattern(raw: string) {
    return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Fila mínima para agregar por día en el gráfico de movimientos. */
export type MovimientoStockForChartRow = {
    id: string;
    created_at: string;
    tipo: string;
    cantidad: number;
    precio_unitario: string | number | null;
    venta_id: string | null;
    producto_id: string;
    stock_nuevo: number | null;
};

const CHART_MOV_PAGE = 1000;
const IN_CHUNK_SIZE = 120;

export type ListMovimientosStockForChartOpts = {
    fromIso: string;
    toIso: string;
    productoId?: string | null;
};

/**
 * Movimientos en un rango de fechas (para gráfico). Pagina por chunks de `producto_id` y por rango SQL.
 */
export async function listMovimientosStockForChart(client: SupabaseClient, negocioId: string, opts: ListMovimientosStockForChartOpts) {
    const { data: productos, error: e1 } = await client.from("productos").select("id").eq("negocio_id", negocioId);

    if (e1) return { data: null, error: e1 };

    let ids = (productos ?? []).map((p) => p.id);
    if (opts.productoId) {
        ids = ids.includes(opts.productoId) ? [opts.productoId] : [];
    }
    if (ids.length === 0) {
        return { data: [] as MovimientoStockForChartRow[], error: null };
    }

    const selectCols = "id, created_at, tipo, cantidad, precio_unitario, venta_id, producto_id, stock_nuevo";

    const merged: MovimientoStockForChartRow[] = [];

    for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
        const chunk = ids.slice(i, i + IN_CHUNK_SIZE);
        let offset = 0;
        for (;;) {
            const { data, error } = await client
                .from("movimientos_stock")
                .select(selectCols)
                .in("producto_id", chunk)
                .gte("created_at", opts.fromIso)
                .lte("created_at", opts.toIso)
                .order("created_at", { ascending: true })
                .order("id", { ascending: true })
                .range(offset, offset + CHART_MOV_PAGE - 1);

            if (error) return { data: null, error };

            const batch = (data as MovimientoStockForChartRow[]) ?? [];
            merged.push(...batch);
            if (batch.length < CHART_MOV_PAGE) break;
            offset += CHART_MOV_PAGE;
        }
    }

    merged.sort((a, b) => {
        const t = a.created_at.localeCompare(b.created_at);
        if (t !== 0) return t;
        return String(a.id).localeCompare(String(b.id));
    });

    return { data: merged, error: null };
}

const movimientosSelect = `
  id,
  producto_id,
  tipo,
  cantidad,
  created_at,
  precio_unitario,
  venta_id,
  compra_id,
  stock_anterior,
  stock_nuevo,
  venta_item_id,
  compra_item_id,
  productos ( nombre )
`;

/** Misma fila que `movimientosSelect`, pero con `!inner` para filtrar por columnas de `productos` sin cargar miles de IDs en `.in()`. */
const movimientosSelectSearchInner = `
  id,
  producto_id,
  tipo,
  cantidad,
  created_at,
  precio_unitario,
  venta_id,
  compra_id,
  stock_anterior,
  stock_nuevo,
  venta_item_id,
  compra_item_id,
  productos!inner ( nombre, negocio_id, barcode )
`;

/**
 * Movimientos de productos del negocio, ordenados por `created_at DESC`, `id DESC`.
 * Paginación por cursor (keyset): el cliente pide `limit + 1` vía `limit` o usa el default y recorta para `hasMore`.
 * Con texto de búsqueda (sin `productoId`) se filtra en servidor vía join a `productos`, así el cursor sigue funcionando aunque haya muchos productos coincidentes.
 */
export async function listMovimientosStockPage(client: SupabaseClient, negocioId: string, opts: ListMovimientosStockPageOpts) {
    const limit = opts.limit ?? MOVIMIENTOS_STOCK_PAGE_SIZE;
    const take = limit + 1;
    const search = opts.search?.trim();

    if (search && !opts.productoId) {
        const esc = escapeIlikePattern(search);
        let q = client
            .from("movimientos_stock")
            .select(movimientosSelectSearchInner)
            .eq("productos.negocio_id", negocioId)
            .or(`nombre.ilike.%${esc}%,barcode.ilike.%${esc}%`, {
                foreignTable: "productos",
            })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(take);

        if (opts.cursor) {
            const { created_at, id } = opts.cursor;
            q = q.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`);
        }
        return q;
    }

    const { data: productos, error: e1 } = await client.from("productos").select("id").eq("negocio_id", negocioId);

    if (e1) return { data: null, error: e1 };

    let ids = (productos ?? []).map((p) => p.id);
    if (opts.productoId) {
        ids = ids.includes(opts.productoId) ? [opts.productoId] : [];
    }

    if (ids.length === 0) {
        return { data: [] as MovimientoStockRow[], error: null };
    }

    let q = client
        .from("movimientos_stock")
        .select(movimientosSelect)
        .in("producto_id", ids)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(take);

    if (opts.cursor) {
        const { created_at, id } = opts.cursor;
        q = q.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`);
    }

    return q;
}
