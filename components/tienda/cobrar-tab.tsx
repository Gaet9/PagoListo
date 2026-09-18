"use client";

import { createClient } from "@/lib/supabase/client";
import { listProductos } from "@/lib/queries/productos";
import type { ProductoRow } from "@/lib/types/negocio";
import { BarcodeScannerDialog } from "@/components/tienda/barcode-scanner-dialog";
import { MercadoPagoOAuthStatusBanner } from "@/components/tienda/mercadopago-oauth-status-banner";
import { MercadoPagoQr } from "@/components/tienda/mercadopago-qr";
import { buildMercadoPagoOAuthStartPath } from "@/lib/mercadopago/oauth-start-url";
import { fetchMercadoPagoOAuthStatus } from "@/lib/mercadopago/fetch-oauth-status-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = { negocioId: string };

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

export function CobrarTab({ negocioId }: Props) {
    const [productos, setProductos] = useState<ProductoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [scannerOpen, setScannerOpen] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "transfer" | null>(null);
    const [validating, setValidating] = useState(false);
    const [qrConnected, setQrConnected] = useState<boolean | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrError, setQrError] = useState<string | null>(null);
    const [qrInitPoint, setQrInitPoint] = useState<string | null>(null);
    const [qrIntentoId, setQrIntentoId] = useState<string | null>(null);
    const [oauthReturnPath, setOauthReturnPath] = useState("/tiendas?tab=cobrar");
    const [configuracionHref, setConfiguracionHref] = useState("/tiendas?tab=configuracion");
    /** null = aún no consultado; solo true habilita el método QR. */
    const [mpConnectedForQr, setMpConnectedForQr] = useState<boolean | null>(null);

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

    const resetQrAfterApproved = useCallback(() => {
        toast.success("Pago aprobado", { description: "Venta registrada." });
        setCart([]);
        setPaymentMethod(null);
        setQuery("");
        setQrConnected(null);
        setQrLoading(false);
        setQrError(null);
        setQrInitPoint(null);
        setQrIntentoId(null);
        load();
    }, [load]);

    useEffect(() => {
        if (paymentMethod !== "qr") {
            setQrConnected(null);
            setQrLoading(false);
            setQrError(null);
            setQrInitPoint(null);
            setQrIntentoId(null);
            return;
        }
        let cancelled = false;
        setQrLoading(true);
        setQrError(null);
        setQrInitPoint(null);

        (async () => {
            try {
                const statusResult = await fetchMercadoPagoOAuthStatus(negocioId);
                if (!statusResult.ok) {
                    throw new Error(statusResult.message);
                }

                const connected = statusResult.status.connected;
                if (!cancelled) setQrConnected(connected);
                if (!cancelled) setMpConnectedForQr(connected);

                if (!connected || cart.length === 0) return;

                const res = await fetch("/api/mercadopago/preference", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        negocioId,
                        items: cart.map((it) => ({
                            id: it.producto.id,
                            quantity: it.qty,
                        })),
                    }),
                });
                const data = (await res.json().catch(() => ({}))) as {
                    init_point?: string;
                    sandbox_init_point?: string;
                    intento_id?: string;
                    error?: string;
                };
                if (!res.ok) {
                    if (res.status === 409) {
                        setMpConnectedForQr(false);
                    }
                    throw new Error(data.error || `Error ${res.status}`);
                }
                const initPoint = data.init_point || data.sandbox_init_point;
                if (!initPoint) {
                    throw new Error("La API no devolvió el link de pago (init_point).");
                }
                if (!cancelled) setQrInitPoint(initPoint);
                if (!cancelled) setQrIntentoId(typeof data.intento_id === "string" ? data.intento_id : null);
            } catch (e) {
                if (!cancelled) setQrError(e instanceof Error ? e.message : "No se pudo preparar el QR.");
            } finally {
                if (!cancelled) setQrLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [paymentMethod, cartFingerprint, negocioId, cart]);

    useEffect(() => {
        if (paymentMethod !== "qr" || !qrIntentoId) return;
        const supabase = createClient();
        const channel = supabase
            .channel(`mp_cobro_intentos:${qrIntentoId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "mp_cobro_intentos",
                    filter: `id=eq.${qrIntentoId}`,
                },
                (payload) => {
                    const ventaId = (payload.new as Record<string, unknown> | null)?.["venta_id"];
                    if (typeof ventaId !== "string" || !ventaId) return;
                    resetQrAfterApproved();
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [paymentMethod, qrIntentoId, resetQrAfterApproved]);

    useEffect(() => {
        if (paymentMethod !== "qr" || !qrIntentoId) return;

        let cancelled = false;
        const poll = async () => {
            try {
                const res = await fetch(
                    `/api/mercadopago/cobro-intento/status?intentoId=${encodeURIComponent(qrIntentoId)}`,
                    { method: "GET", credentials: "same-origin" },
                );
                const data = (await res.json().catch(() => ({}))) as { approved?: boolean };
                if (!cancelled && res.ok && data.approved) {
                    resetQrAfterApproved();
                }
            } catch {
                // ignore transient poll errors
            }
        };

        const interval = window.setInterval(poll, 4000);
        poll();

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [paymentMethod, qrIntentoId, resetQrAfterApproved]);

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
                    <div className='pt-2 flex flex-col gap-3 border-t border-border/60 mt-1'>
                        <p className='text-xs text-muted-foreground'>Escanear el QR desde la app de Mercado Pago.</p>

                        {cart.length === 0 ?
                            <p className='text-sm text-muted-foreground'>Agregá productos al carrito para generar un QR de cobro.</p>
                        : qrError ?
                            <p className='text-sm text-destructive'>{qrError}</p>
                        : qrLoading ?
                            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                <Loader2 className='h-4 w-4 animate-spin shrink-0' aria-hidden />
                                Preparando QR…
                            </div>
                        : qrConnected === false ?
                            <div className='flex justify-end'>
                                <Button
                                    type='button'
                                    className='shrink-0'
                                    onClick={() => {
                                        const params = new URLSearchParams(window.location.search);
                                        params.set("tab", "cobrar");
                                        const redirectTo = `${window.location.pathname}?${params.toString()}`;
                                        window.location.href = buildMercadoPagoOAuthStartPath(negocioId, redirectTo);
                                    }}>
                                    Vincular
                                </Button>
                            </div>
                        : qrInitPoint ?
                            <div className='flex flex-col items-center gap-3'>
                                <MercadoPagoQr value={qrInitPoint} />
                                <Button type='button' variant='secondary' asChild>
                                    <a href={qrInitPoint} target='_blank' rel='noreferrer'>
                                        Abrir link de pago
                                    </a>
                                </Button>
                            </div>
                        :   <p className='text-sm text-muted-foreground'>Listo para generar el QR.</p>}
                    </div>
                :   null}
            </section>
        </div>
    );
}
