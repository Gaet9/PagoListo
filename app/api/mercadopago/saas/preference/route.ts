import { NextResponse, type NextRequest } from "next/server";

import { createCheckoutProPreferenceSaas } from "@/lib/mercadopago/checkout-pro-preference";
import { createClient } from "@/lib/supabase/server";

type PostBody = {
  items: Array<{
    id?: string;
    title?: string;
    quantity?: number;
    unit_price?: number;
    currency_id?: string;
    description?: string;
    picture_url?: string;
  }>;
  external_reference?: string;
  payer?: { email?: string; name?: string; surname?: string };
  notification_url?: string;
  metadata?: Record<string, unknown>;
};

function parseBody(json: unknown): PostBody | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (!Array.isArray(o.items)) return null;
  return o as PostBody;
}

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parseBody(json);
  if (!body?.items?.length) {
    return NextResponse.json(
      { error: "Expected a non-empty items array (title, quantity, unit_price per line)." },
      { status: 400 },
    );
  }

  for (const [i, item] of body.items.entries()) {
    if (typeof item.title !== "string" || !item.title.trim()) {
      return NextResponse.json({ error: `items[${i}].title is required` }, { status: 400 });
    }
    if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      return NextResponse.json({ error: `items[${i}].quantity must be a positive number` }, { status: 400 });
    }
    if (typeof item.unit_price !== "number" || !Number.isFinite(item.unit_price) || item.unit_price < 0) {
      return NextResponse.json({ error: `items[${i}].unit_price must be a number >= 0` }, { status: 400 });
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const preference = await createCheckoutProPreferenceSaas({
      items: body.items.map((item) => ({
        id: item.id,
        title: item.title!.trim(),
        quantity: item.quantity!,
        unit_price: item.unit_price!,
        currency_id: item.currency_id,
        description: item.description,
        picture_url: item.picture_url,
      })),
      external_reference: body.external_reference,
      payer: body.payer,
      notification_url: body.notification_url,
      metadata: body.metadata,
    });

    return NextResponse.json(preference);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
