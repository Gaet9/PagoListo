import type { SupabaseClient } from "@supabase/supabase-js";

import type { KeysetCursor } from "@/lib/types/pagination";

const DEFAULT_PAGE_SIZE = 10;

export function escapeIlikePattern(raw: string) {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

const MSG_NOMBRE_DUPLICADO =
  "Ya existe un producto con ese nombre en esta tienda (sin distinguir mayúsculas).";

async function productoNombreDuplicadoEnNegocio(
  client: SupabaseClient,
  negocioId: string,
  nombreTrimmed: string,
  excludeProductoId?: string,
): Promise<{ duplicated: boolean; error: { message: string } | null }> {
  const esc = escapeIlikePattern(nombreTrimmed);
  let q = client.from("productos").select("id").eq("negocio_id", negocioId).ilike("nombre", esc).limit(1);
  if (excludeProductoId) {
    q = q.neq("id", excludeProductoId);
  }
  const { data, error } = await q;
  if (error) {
    return { duplicated: false, error: { message: error.message } };
  }
  return { duplicated: (data?.length ?? 0) > 0, error: null };
}

function mapUniqueNombreError(err: { code?: string; message?: string } | null): null | { message: string } {
  if (!err?.code) return null;
  if (err.code === "23505") {
    const m = (err.message ?? "").toLowerCase();
    if (m.includes("nombre") || m.includes("productos_negocio_id_nombre_lower_trim")) {
      return { message: MSG_NOMBRE_DUPLICADO };
    }
  }
  return null;
}

export type ListProductosOpts = {
  /** Solo productos con Activo = sí (p. ej. pestaña Cobrar). */
  soloActivos?: boolean;
};

export async function listProductos(
  client: SupabaseClient,
  negocioId: string,
  opts?: ListProductosOpts,
) {
  let q = client.from("productos").select("*").eq("negocio_id", negocioId);
  if (opts?.soloActivos) {
    q = q.eq("activo", true);
  }
  return q.order("nombre");
}

export type ListProductosPageOpts = {
  limit?: number;
  cursor?: KeysetCursor | null;
  search?: string;
};

/**
 * Keyset pagination: `created_at DESC`, `id DESC` (stable).
 * Pass `limit + 1` rows are returned when you want `hasMore`; trim client-side.
 */
export async function listProductosPage(
  client: SupabaseClient,
  negocioId: string,
  opts: ListProductosPageOpts,
) {
  const limit = opts.limit ?? DEFAULT_PAGE_SIZE;
  const take = limit + 1;

  let q = client
    .from("productos")
    .select("*")
    .eq("negocio_id", negocioId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(take);

  const search = opts.search?.trim();
  if (search) {
    const esc = escapeIlikePattern(search);
    q = q.or(`nombre.ilike.%${esc}%,barcode.ilike.%${esc}%`);
  }

  if (opts.cursor) {
    const { created_at, id } = opts.cursor;
    q = q.or(
      `created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`,
    );
  }

  return q;
}

export type ProductosTotals = {
  /** Cantidad de productos (filas) que entran en el criterio. */
  lineCount: number;
  /** Suma de `stock_actual` de esos productos. */
  stockTotal: number;
  /** Suma de precios de compra unitarios (una vez por producto, sin ponderar por stock). */
  sumPrecioCompra: number;
  /** Suma de precios de venta unitarios (igual que arriba). */
  sumPrecioVenta: number;
};

function parseMoneyField(v: string | number | null | undefined): number {
  const n =
    typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Totales sobre **todos** los productos del negocio (mismo filtro de búsqueda que el listado).
 * Útil para el pie de tabla con scroll infinito: no depende de las filas ya cargadas.
 */
export async function fetchProductosTotalsForNegocio(
  client: SupabaseClient,
  negocioId: string,
  opts?: { search?: string },
) {
  let q = client
    .from("productos")
    .select("stock_actual, precio_compra, precio_venta")
    .eq("negocio_id", negocioId);

  const search = opts?.search?.trim();
  if (search) {
    const esc = escapeIlikePattern(search);
    q = q.or(`nombre.ilike.%${esc}%,barcode.ilike.%${esc}%`);
  }

  const { data, error } = await q;
  if (error) return { data: null, error };

  const rows =
    (data ?? []) as {
      stock_actual: number;
      precio_compra: string | number | null;
      precio_venta: string | number | null;
    }[];

  let stockTotal = 0;
  let sumPrecioCompra = 0;
  let sumPrecioVenta = 0;
  for (const r of rows) {
    stockTotal += Number(r.stock_actual) || 0;
    sumPrecioCompra += parseMoneyField(r.precio_compra);
    sumPrecioVenta += parseMoneyField(r.precio_venta);
  }

  return {
    data: {
      lineCount: rows.length,
      stockTotal,
      sumPrecioCompra,
      sumPrecioVenta,
    } satisfies ProductosTotals,
    error: null,
  };
}

export type InsertProductoInput = {
  negocio_id: string;
  nombre: string;
  barcode?: string | null;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  activo?: boolean;
};

function validateInsertProductoNumerics(input: InsertProductoInput): { message: string } | null {
  const { precio_compra: pc, precio_venta: pv, stock_actual: st } = input;
  if (!Number.isFinite(pc) || pc < 0) {
    return { message: "Precio de compra no válido: tiene que ser un número mayor o igual a 0." };
  }
  if (!Number.isFinite(pv) || pv < 0) {
    return { message: "Precio de venta no válido: tiene que ser un número mayor o igual a 0." };
  }
  if (!Number.isFinite(st) || !Number.isInteger(st) || st < 0) {
    return {
      message: "Stock no válido: tiene que ser un número entero mayor o igual a 0.",
    };
  }
  return null;
}

export async function insertProducto(
  client: SupabaseClient,
  input: InsertProductoInput,
) {
  const nombre = input.nombre.trim();
  if (!nombre) {
    return { data: null, error: { message: "El nombre es obligatorio." } };
  }

  const numErr = validateInsertProductoNumerics(input);
  if (numErr) {
    return { data: null, error: numErr };
  }

  const dup = await productoNombreDuplicadoEnNegocio(client, input.negocio_id, nombre);
  if (dup.error) {
    return { data: null, error: dup.error };
  }
  if (dup.duplicated) {
    return { data: null, error: { message: MSG_NOMBRE_DUPLICADO } };
  }

  const { data, error } = await client
    .from("productos")
    .insert({
      negocio_id: input.negocio_id,
      nombre,
      barcode: input.barcode?.trim() || null,
      precio_compra: input.precio_compra,
      precio_venta: input.precio_venta,
      stock_actual: input.stock_actual,
      activo: input.activo ?? true,
    })
    .select("*")
    .single();

  const mapped = error ? mapUniqueNombreError(error) : null;
  if (mapped) {
    return { data: null, error: mapped };
  }
  return { data, error };
}

export type UpdateProductoInput = Partial<{
  nombre: string;
  barcode: string | null;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  activo: boolean;
}>;

export async function updateProducto(
  client: SupabaseClient,
  id: string,
  patch: UpdateProductoInput,
) {
  const rowPayload: UpdateProductoInput = { ...patch };

  if (patch.nombre !== undefined) {
    const nombre = patch.nombre.trim();
    if (!nombre) {
      return { data: null, error: { message: "El nombre no puede quedar vacío." } };
    }
    rowPayload.nombre = nombre;

    const { data: selfRow, error: selfErr } = await client
      .from("productos")
      .select("negocio_id")
      .eq("id", id)
      .maybeSingle();
    if (selfErr) {
      return { data: null, error: selfErr };
    }
    if (!selfRow?.negocio_id) {
      return { data: null, error: { message: "Producto no encontrado." } };
    }

    const dup = await productoNombreDuplicadoEnNegocio(
      client,
      selfRow.negocio_id as string,
      nombre,
      id,
    );
    if (dup.error) {
      return { data: null, error: dup.error };
    }
    if (dup.duplicated) {
      return {
        data: null,
        error: {
          message:
            "Ya existe otro producto con ese nombre en esta tienda (sin distinguir mayúsculas).",
        },
      };
    }
  }

  const { data, error } = await client
    .from("productos")
    .update(rowPayload)
    .eq("id", id)
    .select("*")
    .single();

  const mapped = error ? mapUniqueNombreError(error) : null;
  if (mapped) {
    return { data: null, error: mapped };
  }
  return { data, error };
}

/**
 * Borrado físico solo si no hay historial que referencie al producto (compras, ventas, movimientos).
 * Si hay líneas en `compra_items`, Postgres devolvería el error de FK `compra_items_producto_id_fkey`.
 */
export async function deleteProducto(client: SupabaseClient, id: string) {
  const [compras, ventas, movs] = await Promise.all([
    client.from("compra_items").select("*", { count: "exact", head: true }).eq("producto_id", id),
    client.from("venta_items").select("*", { count: "exact", head: true }).eq("producto_id", id),
    client.from("movimientos_stock").select("*", { count: "exact", head: true }).eq("producto_id", id),
  ]);

  const checks = [
    { row: compras, label: "líneas en compras" },
    { row: ventas, label: "líneas en ventas" },
    { row: movs, label: "movimientos de stock" },
  ] as const;

  const blocked: string[] = [];
  for (const { row, label } of checks) {
    if (row.error) {
      return { data: null, error: row.error };
    }
    if ((row.count ?? 0) > 0) {
      blocked.push(label);
    }
  }

  if (blocked.length > 0) {
    return {
      data: null,
      error: {
        message: `No se puede eliminar: el producto tiene ${blocked.join(", ")}. Desactivá el producto desmarcando la casilla Activo si no querés verlo en el catálogo.`,
      },
    };
  }

  return client.from("productos").delete().eq("id", id);
}
