"use client";

import { createClient } from "@/lib/supabase/client";
import {
  deleteProducto,
  insertProducto,
  listProductos,
  updateProducto,
} from "@/lib/queries/productos";
import type { ProductoRow } from "@/lib/types/negocio";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useState } from "react";
import { BarcodeScannerDialog } from "@/components/tienda/barcode-scanner-dialog";
import { Camera, Loader2, Plus, Save, Trash2 } from "lucide-react";

function strMoney(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function parseMoney(s: string) {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseStock(s: string) {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function ProductoRowEditor({
  row,
  onChanged,
}: {
  row: ProductoRow;
  onChanged: () => void;
}) {
  const [nombre, setNombre] = useState(row.nombre);
  const [descripcion, setDescripcion] = useState(row.descripcion ?? "");
  const [sku, setSku] = useState(row.sku ?? "");
  const [barcode, setBarcode] = useState(row.barcode ?? "");
  const [precioCompra, setPrecioCompra] = useState(strMoney(row.precio_compra));
  const [precioVenta, setPrecioVenta] = useState(strMoney(row.precio_venta));
  const [stock, setStock] = useState(String(row.stock_actual));
  const [activo, setActivo] = useState(row.activo);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setNombre(row.nombre);
    setDescripcion(row.descripcion ?? "");
    setSku(row.sku ?? "");
    setBarcode(row.barcode ?? "");
    setPrecioCompra(strMoney(row.precio_compra));
    setPrecioVenta(strMoney(row.precio_venta));
    setStock(String(row.stock_actual));
    setActivo(row.activo);
    setMsg(null);
  }, [row]);

  const guardar = async () => {
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await updateProducto(supabase, row.id, {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      precio_compra: parseMoney(precioCompra),
      precio_venta: parseMoney(precioVenta),
      stock_actual: parseStock(stock),
      activo,
    });
    setSaving(false);
    if (error) setMsg(error.message);
    else onChanged();
  };

  const eliminar = async () => {
    if (!confirm("¿Eliminar este producto?")) return;
    setDeleting(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await deleteProducto(supabase, row.id);
    setDeleting(false);
    if (error) setMsg(error.message);
    else onChanged();
  };

  return (
    <tr className="border-b align-top">
      <td className="p-2 min-w-table-nombre">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="h-8 text-sm"
        />
      </td>
      <td className="p-2 min-w-table-descripcion">
        <Input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="h-8 text-sm"
        />
      </td>
      <td className="p-2 min-w-table-sku">
        <Input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="h-8 text-sm"
        />
      </td>
      <td className="p-2 min-w-table-barcode">
        <Input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          className="h-8 text-sm"
        />
      </td>
      <td className="p-2 w-24">
        <Input
          value={precioCompra}
          onChange={(e) => setPrecioCompra(e.target.value)}
          className="h-8 text-sm"
          inputMode="decimal"
        />
      </td>
      <td className="p-2 w-24">
        <Input
          value={precioVenta}
          onChange={(e) => setPrecioVenta(e.target.value)}
          className="h-8 text-sm"
          inputMode="decimal"
        />
      </td>
      <td className="p-2 w-20">
        <Input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="h-8 text-sm"
          inputMode="numeric"
        />
      </td>
      <td className="p-2 w-20">
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            checked={activo}
            onCheckedChange={(v) => setActivo(v === true)}
            id={`act-${row.id}`}
          />
          <Label htmlFor={`act-${row.id}`} className="text-xs font-normal">
            Sí
          </Label>
        </div>
      </td>
      <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
        {new Date(row.created_at).toLocaleString("es")}
      </td>
      <td className="p-2">
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1 px-2"
            onClick={guardar}
            disabled={saving || deleting}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            ) : (
              <Save className="h-3 w-3 shrink-0" />
            )}
            <span className="text-xs">Guardar</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8 gap-1 px-2"
            onClick={eliminar}
            disabled={saving || deleting}
          >
            {deleting ? (
              <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            ) : (
              <Trash2 className="h-3 w-3 shrink-0" />
            )}
            <span className="text-xs">Eliminar</span>
          </Button>
        </div>
        {msg ? <p className="text-caption text-destructive mt-1">{msg}</p> : null}
      </td>
    </tr>
  );
}

type Props = { negocioId: string };

export function ProductosTab({ negocioId }: Props) {
  const [rows, setRows] = useState<ProductoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nNombre, setNNombre] = useState("");
  const [nDesc, setNDesc] = useState("");
  const [nSku, setNSku] = useState("");
  const [nBarcode, setNBarcode] = useState("");
  const [nPc, setNPc] = useState("0");
  const [nPv, setNPv] = useState("0");
  const [nStock, setNStock] = useState("0");
  const [nActivo, setNActivo] = useState(true);
  const [adding, setAdding] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: e } = await listProductos(supabase, negocioId);
    setLoading(false);
    if (e) {
      setError(e.message);
      return;
    }
    setRows((data as ProductoRow[]) ?? []);
  }, [negocioId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    const supabase = createClient();
    const { error: insErr } = await insertProducto(supabase, {
      negocio_id: negocioId,
      nombre: nNombre,
      descripcion: nDesc || null,
      sku: nSku || null,
      barcode: nBarcode || null,
      precio_compra: parseMoney(nPc),
      precio_venta: parseMoney(nPv),
      stock_actual: parseStock(nStock),
      activo: nActivo,
    });
    setAdding(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setNNombre("");
    setNDesc("");
    setNSku("");
    setNBarcode("");
    setNPc("0");
    setNPv("0");
    setNStock("0");
    setNActivo(true);
    load();
  };

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando productos…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="text-sm text-destructive border border-destructive/30 rounded-md p-3">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={add}
        className="rounded-lg border bg-card p-4 flex flex-col gap-3"
      >
        <p className="text-sm font-medium">Añadir producto</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1">
            <Label htmlFor="np-nombre">Nombre *</Label>
            <Input
              id="np-nombre"
              value={nNombre}
              onChange={(e) => setNNombre(e.target.value)}
              required
              placeholder="Producto"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="np-desc">Descripción</Label>
            <Input
              id="np-desc"
              value={nDesc}
              onChange={(e) => setNDesc(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="np-sku">SKU</Label>
            <Input id="np-sku" value={nSku} onChange={(e) => setNSku(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="np-bar">Código barras</Label>
            <Input
              id="np-bar"
              value={nBarcode}
              onChange={(e) => setNBarcode(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="np-pc">Precio compra</Label>
            <Input
              id="np-pc"
              value={nPc}
              onChange={(e) => setNPc(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="np-pv">Precio venta</Label>
            <Input
              id="np-pv"
              value={nPv}
              onChange={(e) => setNPv(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="np-st">Stock</Label>
            <Input
              id="np-st"
              value={nStock}
              onChange={(e) => setNStock(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <Checkbox
              id="np-act"
              checked={nActivo}
              onCheckedChange={(v) => setNActivo(v === true)}
            />
            <Label htmlFor="np-act" className="font-normal">
              Activo
            </Label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={adding} className="w-fit">
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Añadir producto
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setScannerOpen(true)}
            aria-label="Escanear código de barras"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <BarcodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(text) => setNBarcode(text)}
      />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-2 font-medium">Nombre</th>
              <th className="p-2 font-medium">Descripción</th>
              <th className="p-2 font-medium">SKU</th>
              <th className="p-2 font-medium">Código barras</th>
              <th className="p-2 font-medium">P. compra</th>
              <th className="p-2 font-medium">P. venta</th>
              <th className="p-2 font-medium">Stock</th>
              <th className="p-2 font-medium">Activo</th>
              <th className="p-2 font-medium">Creado</th>
              <th className="p-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-muted-foreground">
                  No hay productos. Usa el formulario de arriba para añadir el
                  primero.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <ProductoRowEditor
                  key={row.id}
                  row={row}
                  onChanged={load}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
