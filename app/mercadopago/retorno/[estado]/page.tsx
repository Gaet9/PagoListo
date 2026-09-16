import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ComprobantePagoPdfButton } from "@/components/mercadopago/comprobante-pago-pdf-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import {
  isMercadoPagoRetornoEstado,
  mercadoPagoRetornoStaticParams,
  type MercadoPagoRetornoEstado,
} from "@/lib/mercadopago/retorno-estado";

const titles: Record<MercadoPagoRetornoEstado, string> = {
  exito: "Pago aprobado",
  pendiente: "Pago pendiente",
  error: "Pago no completado",
};

const descriptions: Record<MercadoPagoRetornoEstado, string> = {
  exito: "Mercado Pago redirigió acá tras un pago aprobado. Si pagaste tu abono de PagoListo, la activación se confirma por notificación; podés revisar el estado en tu perfil.",
  pendiente: "El pago puede estar pendiente (por ejemplo medios offline). Te avisaremos cuando se acredite si configurás notificaciones.",
  error: "El pago fue rechazado o cancelado. Podés intentar de nuevo desde tu perfil o la tienda.",
};

type PageProps = {
  params: Promise<{ estado: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return mercadoPagoRetornoStaticParams();
}

async function MercadoPagoRetornoContent({ params, searchParams }: PageProps) {
  const { estado } = await params;
  if (!isMercadoPagoRetornoEstado(estado)) {
    notFound();
  }

  const sp = await searchParams;
  const entries = Object.entries(sp).filter(([, v]) => v !== undefined && v !== "");

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center gap-10">
        <SiteNav />
        <div className="app-section-inner w-full max-w-2xl px-4 pb-16">
          <h1 className="text-2xl font-semibold tracking-tight">{titles[estado]}</h1>
          <p className="mt-3 text-muted-foreground">{descriptions[estado]}</p>
          {estado === "exito" && entries.length > 0 ? (
            <div className="mt-6">
              <ComprobantePagoPdfButton searchParams={sp} />
            </div>
          ) : null}
          {entries.length > 0 ? (
            <dl className="mt-8 rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <dt className="font-medium text-foreground">Parámetros en la URL (Mercado Pago)</dt>
              <dd className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
                {entries.map(([key, value]) => (
                  <div key={key}>
                    <span className="text-foreground">{key}</span>
                    {": "}
                    {Array.isArray(value) ? value.join(", ") : value}
                  </div>
                ))}
              </dd>
            </dl>
          ) : null}
          <p className="mt-8 flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/perfil/subscripciones" className="text-primary underline underline-offset-4">
              Ir a subscripciones
            </Link>
            <Link href="/tiendas" className="text-primary underline underline-offset-4">
              Volver a tiendas
            </Link>
          </p>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}

function MercadoPagoRetornoFallback() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center gap-10">
        <SiteNav />
        <div className="app-section-inner w-full max-w-2xl px-4 pb-16">
          <p className="text-muted-foreground">Cargando resultado del pago…</p>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}

export default function MercadoPagoRetornoPage(props: PageProps) {
  return (
    <Suspense fallback={<MercadoPagoRetornoFallback />}>
      <MercadoPagoRetornoContent {...props} />
    </Suspense>
  );
}
