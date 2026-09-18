"use client";

import { createClient } from "@/lib/supabase/client";
import { createCobroPreferenceClient } from "@/lib/mercadopago/create-cobro-preference-client";
import { fetchCobroIntentoStatus } from "@/lib/mercadopago/fetch-cobro-intento-status-client";
import { fetchMercadoPagoOAuthStatus } from "@/lib/mercadopago/fetch-oauth-status-client";
import { buildMercadoPagoOAuthStartPath } from "@/lib/mercadopago/oauth-start-url";
import { MercadoPagoQr } from "@/components/tienda/mercadopago-qr";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const COBRO_INTENTO_POLL_MS = 5000;

export type CobrarMpQrCartLine = {
    productoId: string;
    title: string;
    qty: number;
    unitPrice: number;
};

type Props = {
    negocioId: string;
    cartFingerprint: string;
    lines: CobrarMpQrCartLine[];
    oauthReturnPath: string;
    onMpConnectionChange: (connected: boolean) => void;
    onPaymentApproved: () => void;
};

type CheckoutPhase = "empty" | "loading" | "error" | "ready";

export function CobrarMpQrPanel({
    negocioId,
    cartFingerprint,
    lines,
    oauthReturnPath,
    onMpConnectionChange,
    onPaymentApproved,
}: Props) {
    const [phase, setPhase] = useState<CheckoutPhase>("empty");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [initPoint, setInitPoint] = useState<string | null>(null);
    const [intentoId, setIntentoId] = useState<string | null>(null);
    const [mpConnected, setMpConnected] = useState<boolean | null>(null);
    const [retryKey, setRetryKey] = useState(0);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [awaitingPayment, setAwaitingPayment] = useState(false);

    const approvedHandledRef = useRef(false);

    const markApproved = useCallback(() => {
        if (approvedHandledRef.current) return;
        approvedHandledRef.current = true;
        setAwaitingPayment(false);
        onPaymentApproved();
    }, [onPaymentApproved]);

    useEffect(() => {
        approvedHandledRef.current = false;
    }, [intentoId, cartFingerprint]);

    useEffect(() => {
        if (lines.length === 0) {
            setPhase("empty");
            setErrorMessage(null);
            setInitPoint(null);
            setIntentoId(null);
            setMpConnected(null);
            setAwaitingPayment(false);
            return;
        }

        let cancelled = false;
        setPhase("loading");
        setErrorMessage(null);
        setInitPoint(null);
        setIntentoId(null);
        setAwaitingPayment(false);

        (async () => {
            const statusResult = await fetchMercadoPagoOAuthStatus(negocioId);
            if (cancelled) return;
            if (!statusResult.ok) {
                setMpConnected(false);
                onMpConnectionChange(false);
                setPhase("error");
                setErrorMessage(statusResult.message);
                return;
            }

            const connected = statusResult.status.connected;
            setMpConnected(connected);
            onMpConnectionChange(connected);
            if (!connected) {
                setPhase("error");
                setErrorMessage("Mercado Pago no está vinculado.");
                return;
            }

            const pref = await createCobroPreferenceClient(
                negocioId,
                lines.map((line) => ({
                    id: line.productoId,
                    title: line.title,
                    quantity: line.qty,
                    unit_price: line.unitPrice,
                    currency_id: "ARS" as const,
                })),
            );
            if (cancelled) return;
            if (!pref.ok) {
                setPhase("error");
                setErrorMessage(pref.message);
                return;
            }

            setInitPoint(pref.initPoint);
            setIntentoId(pref.intentoId);
            setPhase("ready");
            setAwaitingPayment(true);
        })();

        return () => {
            cancelled = true;
        };
    }, [lines, cartFingerprint, negocioId, onMpConnectionChange, retryKey]);

    useEffect(() => {
        if (!intentoId || phase !== "ready") return;

        const supabase = createClient();
        const channel = supabase
            .channel(`mp_cobro_intentos:${intentoId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "mp_cobro_intentos",
                    filter: `id=eq.${intentoId}`,
                },
                (payload) => {
                    const ventaId = (payload.new as Record<string, unknown> | null)?.["venta_id"];
                    if (typeof ventaId !== "string" || !ventaId) return;
                    markApproved();
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [intentoId, phase, markApproved]);

    useEffect(() => {
        if (!intentoId || phase !== "ready") return;

        let cancelled = false;

        const poll = async () => {
            const result = await fetchCobroIntentoStatus(intentoId);
            if (cancelled || !result.ok) return;
            if (result.status.approved) {
                markApproved();
            }
        };

        void poll();
        const id = window.setInterval(() => void poll(), COBRO_INTENTO_POLL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [intentoId, phase, markApproved]);

    const checkStatusNow = useCallback(async () => {
        if (!intentoId) return;
        setCheckingStatus(true);
        const result = await fetchCobroIntentoStatus(intentoId);
        setCheckingStatus(false);
        if (!result.ok) {
            setErrorMessage(result.message);
            setPhase("error");
            setAwaitingPayment(false);
            return;
        }
        if (result.status.approved) {
            markApproved();
            return;
        }
        setAwaitingPayment(true);
    }, [intentoId, markApproved]);

    const startVincular = () => {
        window.location.href = buildMercadoPagoOAuthStartPath(negocioId, oauthReturnPath);
    };

    return (
        <div className='pt-2 flex flex-col gap-3 border-t border-border/60 mt-1'>
            <p className='text-xs text-muted-foreground'>El cliente escanea el QR con Mercado Pago.</p>

            <div
                className='rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm'
                role='status'
                aria-live='polite'>
                {phase === "empty" ?
                    <span className='text-muted-foreground'>Agregá productos al carrito para generar el QR.</span>
                : phase === "loading" ?
                    <span className='flex items-center gap-2 text-muted-foreground'>
                        <Loader2 className='h-4 w-4 animate-spin shrink-0' aria-hidden />
                        Preparando QR…
                    </span>
                : phase === "error" ?
                    <span className='text-destructive'>{errorMessage ?? "No pudimos preparar el cobro."}</span>
                : awaitingPayment ?
                    <span>Esperando pago del cliente…</span>
                :   <span className='text-muted-foreground'>QR listo.</span>}
            </div>

            {phase === "error" && mpConnected === false ?
                <div className='flex flex-wrap gap-2 justify-end'>
                    <Button type='button' className='shrink-0' onClick={startVincular}>
                        Vincular
                    </Button>
                </div>
            : null}

            {phase === "error" && mpConnected !== false ?
                <div className='flex justify-end'>
                    <Button type='button' variant='outline' onClick={() => setRetryKey((k) => k + 1)}>
                        Reintentar
                    </Button>
                </div>
            : null}

            {phase === "ready" && initPoint ?
                <div className='flex flex-col items-center gap-3'>
                    <MercadoPagoQr value={initPoint} />
                    <div className='flex flex-wrap gap-2 justify-center w-full'>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={checkingStatus}
                            onClick={() => void checkStatusNow()}>
                            {checkingStatus ?
                                <>
                                    <Loader2 className='h-4 w-4 animate-spin shrink-0 mr-2' aria-hidden />
                                    Consultando…
                                </>
                            :   <>
                                    <RefreshCw className='h-4 w-4 shrink-0 mr-2' aria-hidden />
                                    Consultar pago
                                </>
                            }
                        </Button>
                        <Button type='button' variant='secondary' size='sm' asChild>
                            <a href={initPoint} target='_blank' rel='noreferrer'>
                                Abrir link
                            </a>
                        </Button>
                    </div>
                </div>
            :   null}
        </div>
    );
}
