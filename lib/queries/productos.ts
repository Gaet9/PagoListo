import type { SupabaseClient } from "@supabase/supabase-js";

export async function listProductos(
  client: SupabaseClient,
  negocioId: string,
) {
  return client
    .from("productos")
    .select("*")
    .eq("negocio_id", negocioId)
    .order("nombre");
}

export type InsertProductoInput = {
  negocio_id: string;
  nombre: string;
  descripcion?: string | null;
  sku?: string | null;
  barcode?: string | null;
  precio_compra?: number;
  precio_venta?: number;
  stock_actual?: number;
  activo?: boolean;
};

export async function insertProducto(
  client: SupabaseClient,
  input: InsertProductoInput,
) {
  return client
    .from("productos")
    .insert({
      negocio_id: input.negocio_id,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() || null,
      sku: input.sku?.trim() || null,
      barcode: input.barcode?.trim() || null,
      precio_compra: input.precio_compra ?? 0,
      precio_venta: input.precio_venta ?? 0,
      stock_actual: input.stock_actual ?? 0,
      activo: input.activo ?? true,
    })
    .select("*")
    .single();
}

export type UpdateProductoInput = Partial<{
  nombre: string;
  descripcion: string | null;
  sku: string | null;
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
  return client
    .from("productos")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
}

export async function deleteProducto(client: SupabaseClient, id: string) {
  return client.from("productos").delete().eq("id", id);
}
