import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPRAS_COMPROBANTES_BUCKET = "compras-comprobantes";

/** Límite alineado con el tope del plan free de Supabase Storage (50 MB). */
export const COMPRAS_COMPROBANTE_MAX_BYTES = 50 * 1024 * 1024;

const DEFAULT_SIGNED_SECONDS = 60 * 60; // 1 h

/**
 * Sube factura/remito o foto del comprobante. Ruta: `{auth.uid()}/{negocioId}/{uuid}.ext`
 * (debe coincidir con las políticas RLS del bucket). Bucket privado: guardá `storagePath` en BD.
 */
export async function uploadCompraComprobante(
    client: SupabaseClient,
    negocioId: string,
    file: File,
): Promise<{ storagePath: string | null; error: { message: string } | null }> {
    if (file.size > COMPRAS_COMPROBANTE_MAX_BYTES) {
        return {
            storagePath: null,
            error: { message: "El archivo supera el tamaño máximo permitido (50 MB)." },
        };
    }

    const {
        data: { user },
        error: userErr,
    } = await client.auth.getUser();
    if (userErr || !user) {
        return {
            storagePath: null,
            error: { message: "Tenés que iniciar sesión para subir el comprobante." },
        };
    }

    const rawExt = file.name.includes(".") ? (file.name.split(".").pop() ?? "").toLowerCase() : "";
    const extFromMime =
        file.type === "application/pdf" ? "pdf"
        : file.type === "image/png" ? "png"
        : file.type === "image/webp" ? "webp"
        : "jpg";
    const safeExt = /^[a-z0-9]{2,8}$/.test(rawExt) ? rawExt : extFromMime;
    const safeName = `${crypto.randomUUID()}.${safeExt}`;
    const path = `${user.id}/${negocioId}/${safeName}`;

    const { error: upErr } = await client.storage.from(COMPRAS_COMPROBANTES_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
    });
    if (upErr) {
        return { storagePath: null, error: { message: upErr.message } };
    }

    return { storagePath: path, error: null };
}

/** URL temporal para descargar o abrir el comprobante (solo con sesión válida). */
export async function getCompraComprobanteSignedUrl(
    client: SupabaseClient,
    storagePath: string,
    expiresInSeconds: number = DEFAULT_SIGNED_SECONDS,
): Promise<{ signedUrl: string | null; error: { message: string } | null }> {
    const trimmed = storagePath.trim();
    if (!trimmed) {
        return { signedUrl: null, error: { message: "Ruta de comprobante vacía." } };
    }

    const { data, error } = await client.storage.from(COMPRAS_COMPROBANTES_BUCKET).createSignedUrl(trimmed, expiresInSeconds);

    if (error || !data?.signedUrl) {
        return {
            signedUrl: null,
            error: { message: error?.message ?? "No se pudo generar el enlace de descarga." },
        };
    }
    return { signedUrl: data.signedUrl, error: null };
}
