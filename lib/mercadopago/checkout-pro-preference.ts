import "server-only";

import { Preference } from "mercadopago";
import type { Items } from "mercadopago/dist/clients/commonTypes";
import type { PreferenceRequest } from "mercadopago/dist/clients/preference/commonTypes";

import { buildCheckoutProBackUrls, getPublicSiteBaseUrl } from "./checkout-pro-urls";
import { getMercadoPagoSaasClient } from "./server";

export { buildCheckoutProBackUrls, getPublicSiteBaseUrl } from "./checkout-pro-urls";

export type CheckoutProLineItemInput = {
    id?: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
    description?: string;
    picture_url?: string;
};

export type CreateCheckoutProPreferenceSaasInput = {
    items: CheckoutProLineItemInput[];
    external_reference?: string;
    payer?: PreferenceRequest["payer"];
    notification_url?: string;
    metadata?: PreferenceRequest["metadata"];
};

function normalizeItems(items: CheckoutProLineItemInput[]): Items[] {
    return items.map((item, index) => ({
        id: item.id ?? `line-${index}`,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: item.currency_id ?? "ARS",
        ...(item.description !== undefined ? { description: item.description } : {}),
        ...(item.picture_url !== undefined ? { picture_url: item.picture_url } : {}),
    }));
}

/**
 * Crea una preferencia Checkout Pro (una por cobro / pedido).
 * Incluye `back_urls`, `auto_return: approved` y URLs derivadas de {@link getPublicSiteBaseUrl}.
 */
export async function createCheckoutProPreferenceSaas(
    input: CreateCheckoutProPreferenceSaasInput,
): Promise<{ id: string; init_point?: string; sandbox_init_point?: string }> {
    const baseUrl = getPublicSiteBaseUrl();
    const back_urls = buildCheckoutProBackUrls(baseUrl);

    const body: PreferenceRequest = {
        items: normalizeItems(input.items),
        back_urls,
        auto_return: "approved",
        ...(input.external_reference !== undefined ? { external_reference: input.external_reference } : {}),
        ...(input.payer !== undefined ? { payer: input.payer } : {}),
        ...(input.notification_url !== undefined ? { notification_url: input.notification_url } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    };

    const preference = new Preference(getMercadoPagoSaasClient());
    const created = await preference.create({ body });

    const id = created.id;
    if (!id) {
        throw new Error("Mercado Pago preference response did not include an id");
    }

    return {
        id,
        init_point: created.init_point,
        sandbox_init_point: created.sandbox_init_point,
    };
}
