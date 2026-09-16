"use client";

import type { NegocioListItem } from "@/lib/types/negocio";
import { CrearNegocioForm } from "./crear-negocio-form";
import { CobrarTab } from "./cobrar-tab";
import { ComprasTab } from "./compras-tab";
import { ConfiguracionTab } from "./configuracion-tab";
import { MovimientosTab } from "./movimientos-tab";
import { ProductosTab } from "./productos-tab";
import { VentasTab } from "./ventas-tab";
import { MercadoPagoOAuthFlashBanner } from "./mercadopago-oauth-flash";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Banknote, Package, Receipt, Settings, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "cobrar" | "compras" | "productos" | "ventas" | "movimientos" | "configuracion";

const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
    { id: "cobrar", label: "Cobrar", icon: Banknote },
    { id: "compras", label: "Compras", icon: ShoppingCart },
    { id: "productos", label: "Productos", icon: Package },
    { id: "ventas", label: "Ventas", icon: Receipt },
    { id: "movimientos", label: "Movimientos de stock", icon: ArrowLeftRight },
    { id: "configuracion", label: "Configuración", icon: Settings },
];

type Props = {
    initialNegocios: NegocioListItem[];
    /** Si viene de `/tiendas/[slug]`, fija el negocio activo al resolver el slug. */
    initialNegocioId?: string;
};

export function TiendaDashboard({ initialNegocios, initialNegocioId }: Props) {
    const [negocios, setNegocios] = useState<NegocioListItem[]>(initialNegocios);
    const [tab, setTab] = useState<TabId>("productos");
    /** Evita desmontar pestañas ya visitadas: al volver no se pierde estado ni se muestra de nuevo el cargador completo. */
    const [mountedTabs, setMountedTabs] = useState<ReadonlySet<TabId>>(() => new Set<TabId>(["productos"]));

    const [negocioId, setNegocioId] = useState(() => {
        if (initialNegocioId && initialNegocios.some((n) => n.id === initialNegocioId)) {
            return initialNegocioId;
        }
        return initialNegocios[0]?.id ?? "";
    });

    const currentNegocioId = useMemo(() => {
        if (!negocios.some((n) => n.id === negocioId) && negocios[0]) {
            return negocios[0].id;
        }
        return negocioId;
    }, [negocios, negocioId]);

    const activeNegocio = useMemo(() => negocios.find((n) => n.id === currentNegocioId) ?? negocios[0], [negocios, currentNegocioId]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const raw = params.get("tab")?.trim().toLowerCase();
        if (!raw) return;

        const allowed: TabId[] = ["cobrar", "compras", "productos", "ventas", "movimientos", "configuracion"];
        const next = allowed.includes(raw as TabId) ? (raw as TabId) : null;
        if (!next) return;

        setTab(next);
        setMountedTabs((prev) => new Set(prev).add(next));
    }, []);

    if (negocios.length === 0) {
        return (
            <div className='flex flex-col gap-6'>
                <div>
                    <h1>Mi tienda</h1>
                    <p className='text-muted-foreground text-sm mt-1'>Gestiona productos, ventas y stock de tu negocio.</p>
                </div>
                <CrearNegocioForm
                    onCreated={(n) => {
                        setNegocios([n]);
                        setNegocioId(n.id);
                    }}
                />
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-6 w-full'>
            <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4'>
                <div>
                    <h1>{activeNegocio?.nombre ?? "Mi tienda"}</h1>
                </div>
                {negocios.length > 1 ?
                    <div className='flex flex-col gap-1 min-w-0 w-full sm:w-auto sm:min-w-negocio-select'>
                        <label htmlFor='negocio-select' className='text-xs font-medium text-muted-foreground'>
                            Negocio activo
                        </label>
                        <select
                            id='negocio-select'
                            className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
                            value={currentNegocioId}
                            onChange={(e) => setNegocioId(e.target.value)}>
                            {negocios.map((n) => (
                                <option key={n.id} value={n.id}>
                                    {n.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                :   null}
            </div>

            <MercadoPagoOAuthFlashBanner />

            <div
                className={cn(
                    "flex w-full min-w-0 flex-nowrap gap-1 border-b",
                    "max-sm:sticky max-sm:top-0 max-sm:z-20 max-sm:-mx-1 max-sm:px-1 max-sm:pt-1 max-sm:pb-0.5",
                    "max-sm:bg-background/95 max-sm:backdrop-blur-sm supports-[backdrop-filter]:max-sm:bg-background/80",
                )}>
                {tabs.map((t) => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            type='button'
                            onClick={() => {
                                setTab(t.id);
                                setMountedTabs((prev) => new Set(prev).add(t.id));
                            }}
                            aria-label={t.label}
                            title={t.label}
                            aria-current={tab === t.id ? "page" : undefined}
                            className={cn(
                                "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-t-md border-b-2 px-2 py-2 text-sm font-medium transition-colors sm:px-4 sm:py-2",
                                "-mb-px",
                                tab === t.id ?
                                    "border-primary text-foreground"
                                :   "border-transparent text-muted-foreground hover:text-foreground",
                            )}>
                            <Icon className='h-4 w-4 shrink-0 opacity-90' aria-hidden />
                            <span className='hidden truncate sm:inline'>{t.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className='min-h-dashboard-tab'>
                {mountedTabs.has("cobrar") ?
                    <div key='panel-cobrar' hidden={tab !== "cobrar"}>
                        <CobrarTab negocioId={currentNegocioId} />
                    </div>
                :   null}
                {mountedTabs.has("compras") ?
                    <div key='panel-compras' hidden={tab !== "compras"}>
                        <ComprasTab negocioId={currentNegocioId} />
                    </div>
                :   null}
                {mountedTabs.has("productos") ?
                    <div key='panel-productos' hidden={tab !== "productos"}>
                        <ProductosTab negocioId={currentNegocioId} />
                    </div>
                :   null}
                {mountedTabs.has("ventas") ?
                    <div key='panel-ventas' hidden={tab !== "ventas"}>
                        <VentasTab negocioId={currentNegocioId} />
                    </div>
                :   null}
                {mountedTabs.has("movimientos") ?
                    <div key='panel-movimientos' hidden={tab !== "movimientos"}>
                        <MovimientosTab negocioId={currentNegocioId} />
                    </div>
                :   null}
                {mountedTabs.has("configuracion") ?
                    <div key='panel-configuracion' hidden={tab !== "configuracion"}>
                        <ConfiguracionTab negocioId={currentNegocioId} />
                    </div>
                :   null}
            </div>
        </div>
    );
}
