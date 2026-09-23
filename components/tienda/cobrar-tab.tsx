"use client";

import { createClient } from "@/lib/supabase/client";
import { listProductos } from "@/lib/queries/productos";
import type { ProductoRow } from "@/lib/types/negocio";
import { BarcodeScannerDialog } from "@/components/tienda/barcode-scanner-dialog";
import { MercadoPagoOAuthStatusBanner } from "@/components/tienda/mercadopago-oauth-status-banner";
import { DescargarComprobantePagoButton } from "@/components/mercadopago/descargar-comprobante-pago-button";
import { CobrarMpQrPanel } from "@/components/tienda/cobrar-mp-qr-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, Minus, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
    negocioId: string;
    allowMpOAuthManagement?: boolean;
};

type CartItem = {
    producto: ProductoRow;
    qty: number;
};

function moneyARS(v: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
    }).format(v);
}

function toNumber(v: string | number | null | undefined) {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

export function CobrarTab({ negocioId, allowMpOAuthManagement = true }: Props) {
    const [productos, setProductos] = useState<ProductoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [scannerOpen, setScannerOpen] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "transfer" | null>(null);
    const [validating, setValidating] = useState(false);
    const [oauthReturnPath, setOauthReturnPath] = useState("/tiendas?tab=cobrar");
    const [configuracionHref, setConfiguracionHref] = useState("/tiendas?tab=configuracion");
    /** null = aún no consultado; solo true habilita el método QR. */
    const [mpConnectedForQr, setMpConnectedForQr] = useState<boolean | null>(null);
    const [lastMpVentaId, setLastMpVentaId] = useState<string | null>(null);

    const handleMpConnectionChange = useCallback((connected: boolean) => {
        setMpConnectedForQr(connected);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const supabase = createClient();
        const { data, error: e } = await listProductos(supabase, negocioId, {
            soloActivos: true,
        });
        setLoading(false);
        if (e) {
            setError(e.message);
            return;
        }
        setProductos((data as ProductoRow[]) ?? []);
    }, [negocioId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const cobrarParams = new URLSearchParams(window.location.search);
        cobrarParams.set("tab", "cobrar");
        setOauthReturnPath(`${window.location.pathname}?${cobrarParams.toString()}`);
        const configParams = new URLSearchParams(window.location.search);
        configParams.set("tab", "configuracion");
        setConfiguracionHref(`${window.location.pathname}?${configParams.toString()}`);
    }, []);

    useEffect(() => {
        if (mpConnectedForQr !== false || paymentMethod !== "qr") return;
        setPaymentMethod(null);
    }, [mpConnectedForQr, paymentMethod]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        const out: ProductoRow[] = [];
        for (const p of productos) {
            if (!p.activo) continue;
            const nombre = p.nombre.toLowerCase();
            const bc = (p.barcode ?? "").toLowerCase();
            if (nombre.includes(q) || bc.includes(q)) out.push(p);
            if (out.length >= 8) break;
        }
        return out;
    }, [productos, query]);

    const addProducto = useCallback((p: ProductoRow, qty = 1) => {
        setCart((prev) => {
            const idx = prev.findIndex((it) => it.producto.id === p.id);
            if (idx === -1) return [...prev, { producto: p, qty }];
            const copy = prev.slice();
            copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
            return copy;
        });
    }, []);

    const addByBarcode = useCallback(
        (barcode: string) => {
            const code = barcode.trim();
            const p = productos.find((x) => x.activo && (x.barcode ?? "").trim() === code);
            if (!p) {
                toast.error("Producto no encontrado", { description: `Código: ${code}` });
                return;
            }
            addProducto(p, 1);
            toast.success("Producto añadido");
        },
        [addProducto, productos],
    );

    const subtotal = useMemo(() => {
        return cart.reduce((acc, it) => acc + toNumber(it.producto.precio_venta) * it.qty, 0);
    }, [cart]);

    const cartFingerprint = useMemo(() => cart.map((it) => `${it.producto.id}:${it.qty}`).join("|"), [cart]);

    const qrCartLines = useMemo(
        () =>
            cart.map((it) => ({
                productoId: it.producto.id,
                title: it.producto.nombre,
                qty: it.qty,
                unitPrice: toNumber(it.producto.precio_venta),
            })),
        [cart],
    );

    const handleQrPaymentApproved = useCallback(
        (ventaId: string) => {
            toast.success("Pago aprobado", { description: "Venta registrada." });
            setLastMpVentaId(ventaId);
            setCart([]);
            setPaymentMethod(null);
            setQuery("");
            load();
        },
        [load],
    );

    const validarEfectivo = useCallback(async () => {
        if (cart.length === 0) {
            toast.error("No hay productos para cobrar");
            return;
        }
        setValidating(true);
        const supabase = createClient();
        const items = cart.map((it) => ({ producto_id: it.producto.id, qty: it.qty }));
        const { error: rpcErr } = await supabase.rpc("create_venta_efectivo", {
            p_negocio_id: negocioId,
            p_items: items,
        });
        setValidating(false);
        if (rpcErr) {
            toast.error("No se pudo validar el cobro", { description: rpcErr.message });
            return;
        }
        toast.success("Cobro validado");
        setCart([]);
        setPaymentMethod(null);
        setQuery("");
        load();
    }, [cart, load, negocioId]);

    if (loading && productos.length === 0) {
        return (
            <div className='flex items-center gap-2 text-muted-foreground py-8'>
                <span className='text-sm'>Cargando datos de cobro…</span>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-6'>
            {error ?
                <p className='text-sm text-destructive border border-destructive/30 rounded-md p-3'>{error}</p>
            :   null}

            <div>
                <h2>Cobrar</h2>
                <p className='mt-1 text-sm text-muted-foreground'>
                    Registrá ventas en el mostrador: buscá productos, armá el carrito y elegí el medio de pago.
                </p>
            </div>

            <MercadoPagoOAuthStatusBanner
                negocioId={negocioId}
                oauthReturnPath={oauthReturnPath}
                configuracionHref={configuracionHref}
                variant='cobrar'
                onConnectionChange={handleMpConnectionChange}
                allowOAuthManagement={allowMpOAuthManagement}
            />

            <section className='rounded-lg border bg-card p-4 flex flex-col gap-3'>
                <div className='flex items-start justify-between gap-3'>
                    <div>
                        <p className='text-sm text-muted-foreground'>Buscá por nombre o código de barras, o escaneá con la cámara.</p>
                    </div>
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='shrink-0'
                        onClick={() => setScannerOpen(true)}
                        aria-label='Escanear código de barras'>
                        <Camera className='h-4 w-4' />
                    </Button>
                </div>

                <div className='relative'>
                    <div className='flex gap-2'>
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder='Nombre o código de barras…'
                            autoComplete='off'
                        />
                        <Button
                            type='button'
                            variant='secondary'
                            onClick={() => {
                                const q = query.trim();
                                if (!q) return;
                                const exactBarcode = productos.find((p) => (p.barcode ?? "").trim() === q);
                                if (exactBarcode) {
                                    addProducto(exactBarcode, 1);
                                    toast.success("Producto añadido");
                                    setQuery("");
                                    return;
                                }
                                if (filtered[0]) {
                                    addProducto(filtered[0], 1);
                                    toast.success("Producto añadido");
                                    setQuery("");
                                    return;
                                }
                                toast.error("Producto no encontrado");
                            }}>
                            Validar
                        </Button>
                    </div>

                    {filtered.length > 0 ?
                        <div className='absolute z-10 mt-2 w-full rounded-md border bg-popover shadow'>
                            {filtered.map((p) => (
                                <button
                                    key={p.id}
                                    type='button'
                                    className='w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between gap-3'
                                    onClick={() => {
                                        addProducto(p, 1);
                                        toast.success("Producto añadido");
                                        setQuery("");
                                    }}>
                                    <span className='truncate'>{p.nombre}</span>
                                    <span className='text-muted-foreground shrink-0'>{moneyARS(toNumber(p.precio_venta))}</span>
                                </button>
                            ))}
                        </div>
                    :   null}
                </div>
            </section>

            <BarcodeScannerDialog
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onDetected={addByBarcode}
                closeOnDetected={false}
            />

            <section className='rounded-lg border overflow-hidden'>
                <div className='border-b bg-muted/50 px-4 py-2'>
                    <h3 className='text-sm font-medium'>Detalle</h3>
                </div>

                {cart.length === 0 ?
                    <div className='p-6 text-center text-muted-foreground text-sm'>Todavía no agregaste productos.</div>
                :   <div className='divide-y'>
                        {cart.map((it) => {
                            const unit = toNumber(it.producto.precio_venta);
                            const total = unit * it.qty;
                            return (
                                <div key={it.producto.id} className='p-4 flex items-center gap-3'>
                                    <div className='min-w-0 flex-1'>
                                        <p className='font-medium truncate'>{it.producto.nombre}</p>
                                        <p className='text-xs text-muted-foreground'>{moneyARS(unit)} c/u</p>
                                    </div>

                                    <div className='flex items-center gap-2'>
                                        <Button
                                            type='button'
                                            size='icon'
                                            variant='outline'
                                            className='h-8 w-8'
                                            onClick={() =>
                                                setCart((prev) =>
                                                    prev
                                                        .map((x) =>
                                                            x.producto.id === it.producto.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x,
                                                        )
                                                        .filter((x) => x.qty > 0),
                                                )
                                            }
                                            aria-label='Restar'>
                                            <Minus className='h-4 w-4' />
                                        </Button>
                                        <span className='w-8 text-center text-sm tabular-nums'>{it.qty}</span>
                                        <Button
                                            type='button'
                                            size='icon'
                                            variant='outline'
                                            className='h-8 w-8'
                                            onClick={() =>
                                                setCart((prev) =>
                                                    prev.map((x) => (x.producto.id === it.producto.id ? { ...x, qty: x.qty + 1 } : x)),
                                                )
                                            }
                                            aria-label='Sumar'>
                                            <Plus className='h-4 w-4' />
                                        </Button>
                                    </div>

                                    <div className='text-right'>
                                        <p className='text-sm font-medium tabular-nums'>{moneyARS(total)}</p>
                                        <Button
                                            type='button'
                                            size='icon'
                                            variant='ghost'
                                            className='h-8 w-8'
                                            onClick={() => setCart((prev) => prev.filter((x) => x.producto.id !== it.producto.id))}
                                            aria-label='Quitar'>
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                }

                <div className='border-t bg-card px-4 py-3 flex items-center justify-between'>
                    <span className='text-sm font-medium'>Total</span>
                    <span className='text-sm font-semibold tabular-nums'>{moneyARS(subtotal)}</span>
                </div>
            </section>

            {lastMpVentaId ?
                <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3'>
                    <p className='text-sm text-muted-foreground'>Último cobro con Mercado Pago</p>
                    <DescargarComprobantePagoButton ventaId={lastMpVentaId} />
                </div>
            :   null}

            <section className='rounded-lg border bg-card p-4 flex flex-col gap-3'>
                <h3 className='text-sm font-medium'>Método de pago</h3>
                <div className='flex flex-wrap gap-2'>
                    <Button
                        type='button'
                        variant={paymentMethod === "cash" ? "default" : "outline"}
                        onClick={() => setPaymentMethod("cash")}>
                        Efectivo
                    </Button>
                    <Button
                        type='button'
                        variant={paymentMethod === "qr" ? "default" : "outline"}
                        disabled={mpConnectedForQr !== true}
                        title={mpConnectedForQr === false ? "Vinculá Mercado Pago arriba" : undefined}
                        onClick={() => setPaymentMethod("qr")}>
                        Mercado Pago (QR)
                    </Button>
                    <Button
                        type='button'
                        variant={paymentMethod === "transfer" ? "default" : "outline"}
                        onClick={() => setPaymentMethod("transfer")}>
                        Transferencia
                    </Button>
                </div>

                {paymentMethod === "cash" ?
                    <div className='pt-2 flex justify-end'>
                        <Button type='button' disabled={validating || cart.length === 0} onClick={validarEfectivo}>
                            {validating ? "Validando…" : "Validar cobro"}
                        </Button>
                    </div>
                :   null}

                {paymentMethod === "qr" ?
                    <CobrarMpQrPanel
                        negocioId={negocioId}
                        cartFingerprint={cartFingerprint}
                        lines={qrCartLines}
                        oauthReturnPath={oauthReturnPath}
                        onMpConnectionChange={handleMpConnectionChange}
                        onPaymentApproved={handleQrPaymentApproved}
                    />
                :   null}
            </section>
        </div>
    );
}
