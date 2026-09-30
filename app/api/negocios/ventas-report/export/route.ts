import { NextResponse, type NextRequest } from "next/server";

import { denyUnlessNegocioManager } from "@/lib/auth/negocio-manager-api";
import { listVentasTotalsForChart } from "@/lib/queries/ventas";
import {
  buildVentasReportCsv,
  parseVentasReportExportSearchParams,
  resolveVentasReportRange,
  summarizeVentasTotals,
} from "@/lib/ventas/report";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const parsed = parseVentasReportExportSearchParams(request.nextUrl.searchParams);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const rangeResolved = resolveVentasReportRange({
    preset: parsed.preset,
    customFromYmd: parsed.customFromYmd,
    customToYmd: parsed.customToYmd,
  });
  if ("error" in rangeResolved) {
    return NextResponse.json({ error: rangeResolved.error }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const denied = await denyUnlessNegocioManager(supabase, parsed.negocioId);
  if (denied) {
    return denied;
  }

  const { data, error } = await listVentasTotalsForChart(
    supabase,
    parsed.negocioId,
    {
      fromIso: rangeResolved.fromIso,
      toIso: rangeResolved.toIso,
    },
  );
  if (error) {
    return NextResponse.json(
      { error: "No se pudieron cargar las ventas" },
      { status: 500 },
    );
  }

  const summary = summarizeVentasTotals(
    data ?? [],
    rangeResolved.fromYmd,
    rangeResolved.toYmd,
  );
  const csv = buildVentasReportCsv(summary);
  const filename = `ventas-${rangeResolved.fromYmd}_${rangeResolved.toYmd}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
