export type NegocioListItem = {
  id: string;
  nombre: string;
  localizacion: string | null;
};

export type ProductoRow = {
  id: string;
  negocio_id: string;
  nombre: string;
  barcode: string | null;
  precio_compra: string | number | null;
  precio_venta: string | number | null;
  stock_actual: number;
  activo: boolean;
  created_at: string;
};

export type VentaRow = {
  id: string;
  negocio_id: string;
  usuario_id: string;
  total: string | number | null;
  metodo_pago: string;
  estado: string;
  created_at: string;
};

export type VentaItemRow = {
  id: string;
  venta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: string | number;
  subtotal: string | number | null;
  // Supabase nested select may return an object or 1-element array depending on relationship inference.
  productos: { nombre: string } | { nombre: string }[] | null;
};

export type CompraItemRow = {
  id: string;
  compra_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: string | number;
  subtotal: string | number | null;
  productos: { nombre: string } | { nombre: string }[] | null;
};

export type VentaConItemsRow = VentaRow & {
  venta_items: VentaItemRow[] | null;
};

/** Fila de `venta_mercadopago`: preferencia / pago MP por venta (Checkout Pro). */
export type VentaMercadoPagoRow = {
  id: string;
  venta_id: string;
  mp_preference_id: string;
  mp_payment_id: string | null;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
};

export type MovimientoStockRow = {
  id: string;
  producto_id: string;
  tipo: string;
  /** Texto en BD: `compra`, `venta`, `ajuste` (y valores viejos normalizados en UI). */
  motivo?: string | null;
  cantidad: number;
  created_at: string;
  /** Precio unitario de referencia (compra o venta según el movimiento). */
  precio_unitario?: string | number | null;
  venta_id?: string | null;
  compra_id?: string | null;
  stock_anterior?: number | null;
  stock_nuevo?: number | null;
  venta_item_id?: string | null;
  compra_item_id?: string | null;
  productos: { nombre: string } | null;
};
