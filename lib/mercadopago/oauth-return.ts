/** Query params usados al volver del callback OAuth (sin exponer tokens). */
export const MP_OAUTH_FLASH_PARAM = "mp_oauth";
export const MP_OAUTH_ERROR_CODE_PARAM = "mp_oauth_error";

export type MpOAuthFlashKind = "ok" | "error";

export type MpOAuthErrorCode =
    | "cancelado"
    | "estado_invalido"
    | "estado_expirado"
    | "intercambio_fallido"
    | "guardado_fallido"
    | "falta_autorizacion";

const ERROR_MESSAGES: Record<MpOAuthErrorCode, string> = {
    cancelado: "No autorizaste la conexión en Mercado Pago. Podés intentarlo de nuevo cuando quieras.",
    estado_invalido: "La vinculación expiró o el enlace no es válido. Volvé a Configuración y tocá «Vincular».",
    estado_expirado: "Pasó demasiado tiempo antes de autorizar. Volvé a Configuración e iniciá la conexión otra vez.",
    intercambio_fallido:
        "Mercado Pago no pudo completar la vinculación. Revisá que tu cuenta MP esté activa e intentá de nuevo en unos minutos.",
    guardado_fallido: "No pudimos guardar la conexión. Reintentá; si sigue fallando, contactá soporte.",
    falta_autorizacion: "Faltó confirmar el acceso en Mercado Pago. Volvé a intentar el enlace de conexión.",
};

export function isMpOAuthErrorCode(value: string): value is MpOAuthErrorCode {
    return value in ERROR_MESSAGES;
}

export function mpOAuthErrorMessage(code: string | null | undefined): string {
    if (code && isMpOAuthErrorCode(code)) return ERROR_MESSAGES[code];
    return "No se pudo vincular Mercado Pago. Volvé a Configuración e intentá de nuevo.";
}

export type MpOAuthFlash =
    | { kind: "ok" }
    | { kind: "error"; code: string; message: string };

export function parseMpOAuthFlashFromSearchParams(params: URLSearchParams): MpOAuthFlash | null {
    const raw = params.get(MP_OAUTH_FLASH_PARAM)?.trim().toLowerCase();
    if (raw === "ok") return { kind: "ok" };
    if (raw === "error") {
        const code = params.get(MP_OAUTH_ERROR_CODE_PARAM)?.trim() ?? "";
        return { kind: "error", code, message: mpOAuthErrorMessage(code) };
    }
    return null;
}

/** Añade parámetros de flash a una URL de retorno (mismo origen, path relativo o absoluto en origin). */
export function withMpOAuthFlashOnUrl(url: URL, flash: MpOAuthFlash): URL {
    const next = new URL(url.toString());
    if (flash.kind === "ok") {
        next.searchParams.set(MP_OAUTH_FLASH_PARAM, "ok");
        next.searchParams.delete(MP_OAUTH_ERROR_CODE_PARAM);
    } else {
        next.searchParams.set(MP_OAUTH_FLASH_PARAM, "error");
        if (flash.code) next.searchParams.set(MP_OAUTH_ERROR_CODE_PARAM, flash.code);
    }
    return next;
}

export function stripMpOAuthFlashParams(params: URLSearchParams): URLSearchParams {
    const next = new URLSearchParams(params);
    next.delete(MP_OAUTH_FLASH_PARAM);
    next.delete(MP_OAUTH_ERROR_CODE_PARAM);
    return next;
}
