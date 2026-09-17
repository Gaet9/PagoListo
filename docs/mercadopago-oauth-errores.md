# Mercado Pago OAuth — errores recuperables

Al vincular la cuenta de Mercado Pago de una tienda, la app redirige de vuelta con el parámetro `mp_oauth` en la URL (sin exponer tokens). Los mensajes en pantalla están en español (AR).

## Éxito

| Parámetro | Significado |
| --------- | ----------- |
| `mp_oauth=ok` | La cuenta quedó vinculada. Podés cobrar con QR en **Cobrar**. |

## Errores (`mp_oauth=error`)

El código detallado va en `mp_oauth_error`. Todos son **recuperables**: volvé a iniciar el flujo desde **Configuración** o **Perfil** → «Conectar con Mercado Pago».

| Código | Qué pasó | Qué hacer |
| ------ | -------- | --------- |
| `cancelado` | Cerraste o rechazaste el permiso en Mercado Pago. | Tocá de nuevo «Conectar con Mercado Pago» y aceptá los permisos. |
| `estado_expirado` | Pasaron más de ~10 minutos entre iniciar y autorizar. | Volvé a Configuración e iniciá la conexión otra vez. |
| `estado_invalido` | Enlace de retorno inválido o ya usado (p. ej. pestaña duplicada). | Iniciá un flujo nuevo desde Configuración. |
| `intercambio_fallido` | Mercado Pago no entregó el token (caída temporal o cuenta restringida). | Reintentá en unos minutos; verificá que la cuenta MP del comercio esté activa. |
| `guardado_fallido` | Error al guardar en la base (raro). | Reintentá; si persiste, contactá soporte. |
| `falta_autorizacion` | Respuesta incompleta de Mercado Pago. | Repetí el flujo desde cero. |

## Seguridad (sin cambios)

- **PKCE** obligatorio (`code_verifier` en `mp_oauth_states`; intercambio rechazado si falta).
- **State** de un solo uso en `mp_oauth_states`.
- **Tokens** (`access_token`, `refresh_token`) solo en servidor (`service_role`); el cliente solo ve estado vía `GET /api/mercadopago/oauth/status`.
- El `redirectTo` del inicio OAuth solo acepta rutas del mismo sitio.

## Dónde conectar

1. **Mi tienda → Configuración** — recomendado (pasos y cuenta vinculada).
2. **Perfil** — resumen por negocio y botón «Conectar Mercado Pago» (vuelve a Perfil al terminar).
3. **Cobrar → Mercado Pago (QR)** — si falta la cuenta, botón directo (vuelve a **Cobrar** al terminar).

## Desvincular (API server — GAE-8 / GAE-37 UI, PR #25)

Solo rutas server; nunca borrar tokens desde supabase-js en el navegador.

| Método | Ruta | Body |
| ------ | ---- | ---- |
| `POST` | `/api/mercadopago/oauth/unlink` | `{ "negocioId": "<uuid>" }` |

Constante compartida con el cliente UI: `MERCADOPAGO_OAUTH_UNLINK_API_PATH` en `lib/mercadopago/oauth-unlink-endpoint.ts`.

Respuesta segura (sin tokens): `{ "ok": true }` con HTTP 200 (también si ya estaba desvinculado).

Re-vincular / otra cuenta (#28): unlink, luego `GET /api/mercadopago/oauth/start?negocioId=…&redirectTo=…&forceAccountSelect=1` (authorize con `prompt=login` best-effort). Primer vínculo: sin `forceAccountSelect`.
