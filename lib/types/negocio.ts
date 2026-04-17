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

export type MovimientoStockRow = {
  id: string;
  producto_id: string;
  tipo: string;
  cantidad: number;
  motivo: string;
  created_at: string;
  productos: { nombre: string } | null;
};
