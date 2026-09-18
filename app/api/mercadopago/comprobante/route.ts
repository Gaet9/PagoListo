import { NextResponse, type NextRequest } from "next/server";

import { COBRO_API_ERROR_MESSAGES } from "@/lib/mercadopago/cobro-api-errors";
import {
    resolveComprobantePagoForIntento,
    resolveComprobantePagoForVenta,
} from "@/lib/mercadopago/resolve-comprobante-pago";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const ventaId = url.searchParams.get("ventaId")?.trim() || null;
    const intentoId = url.searchParams.get("intentoId")?.trim() || null;
    const paymentId = url.searchParams.get("paymentId")?.trim() || null;

    if (!ventaId && !intentoId) {
        return badRequest("Falta ventaId o intentoId");
    }

    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: COBRO_API_ERROR_MESSAGES.unauthorized }, { status: 401 });
    }

    if (ventaId) {
        const result = await resolveComprobantePagoForVenta(supabase, ventaId, {
            paymentIdFallback: paymentId,
            intentoId,
        });
        if (!result.data) {
            return NextResponse.json({ error: result.error ?? "No encontrado" }, { status: result.status });
        }
        return NextResponse.json(result.data);
    }

    const admin = createAdminClient();
    const result = await resolveComprobantePagoForIntento(
        supabase,
        admin,
        user.id,
        intentoId!,
        paymentId,
    );
    if (!result.data) {
        return NextResponse.json({ error: result.error ?? "No encontrado" }, { status: result.status });
    }
    return NextResponse.json(result.data);
}
