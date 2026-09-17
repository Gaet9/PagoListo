# Mercado Pago OAuth — checklist de operaciones (PagoListo)

Checklist para Gaétan / Armando al configurar la app en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers) y variables en Vercel.

## Dos aplicaciones MP (no mezclar credenciales)

PagoListo usa **dos apps distintas** en Mercado Pago Developers:

| Rol | Variables Vercel | Panel MP |
| --- | --- | --- |
| **Abono SaaS** (Checkout Pro con token de la plataforma) | `MERCADOPAGO_ACCESS_TOKEN_SAAS`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SAAS` | App de facturación PagoListo; webhooks del abono |
| **OAuth / cobro en tienda** (vincular cuenta del comercio) | `MERCADOPAGO_OAUTH_CLIENT_ID`, `MERCADOPAGO_OAUTH_CLIENT_SECRET` | App de integración tienda; **Redirect URI** + PKCE si está habilitado |

Errores típicos si se mezclan:

- Poner la **Public Key** o el **Access Token SaaS** en `MERCADOPAGO_OAUTH_CLIENT_ID` / `SECRET` → MP muestra *«Lo sentimos, la aplicación no puede conectarse a tu cuenta»* **sin pantalla de login**.
- Usar credenciales de la app **SaaS** (sin Redirect URI de OAuth registrado) para el flujo **Conectar MP** en Configuración.
- Credenciales de **usuarios de prueba** / app en modo prueba con vendedores **productivos** (o al revés).

`MERCADOPAGO_OAUTH_CLIENT_ID` debe ser el **número de aplicación** (App ID) de la app OAuth/cobro, visible en *Detalles de la aplicación* — no el prefijo `APP_USR-` del access token.

### Nombres de variables que lee el código (Vercel)

PagoListo **no** usa `MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, ni variantes sin sufijo `_SAAS` / `MERCADOPAGO_OAUTH_*`. Si existen en Vercel, son **huérfanas** y no afectan OAuth; el abono SaaS solo lee `MERCADOPAGO_ACCESS_TOKEN_SAAS` y `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SAAS`.

| Variable | Formato en producción (cobro / OAuth tienda) | Formato sandbox (solo QA) |
| --- | --- | --- |
| `MERCADOPAGO_OAUTH_CLIENT_ID` | Número **App ID** de la app MP **producción** de cobro (misma app donde está el Redirect URI www) | App ID de la app de **prueba** (otro número; otro Redirect URI en panel) |
| `MERCADOPAGO_OAUTH_CLIENT_SECRET` | **Client Secret** de esa misma app producción (no es `APP_USR-…`) | Secret de la app de prueba |
| `MERCADOPAGO_ACCESS_TOKEN_SAAS` | `APP_USR-…` **producción** (sin prefijo `TEST-`) | `TEST-…` |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SAAS` | Public key **producción** (sin `TEST-`) | `TEST-…` |

**Modo test vs producción en OAuth:** el authorize siempre va a `https://auth.mercadopago.com` con `redirect_uri` de producción. Si `MERCADOPAGO_OAUTH_CLIENT_ID` / `SECRET` pertenecen a una **aplicación de prueba** (la misma familia que credenciales `TEST-` en SaaS), Mercado Pago suele responder *«la aplicación no puede conectarse a tu cuenta»* **sin login**. Gaétan debe comparar en Developers el **Application ID** de la app de cobro **producción** con el valor de `MERCADOPAGO_OAUTH_CLIENT_ID` en Vercel (deben coincidir).

Tras un intento de vincular, revisar logs de `/api/mercadopago/oauth/start`: avisos `[mp-oauth]` por client_id tipo token, `TEST-` en SaaS, o redirect desalineado.

## Cómo arma PagoListo la URL de authorize

El servidor redirige a MP desde `GET /api/mercadopago/oauth/start` (tras sesión Supabase y guardar state + PKCE en `mp_oauth_states`).

Parámetros (ver `lib/mercadopago/oauth.ts` → `buildMercadoPagoAuthorizeUrl`):

| Parámetro | Valor |
| --- | --- |
| Host | `https://auth.mercadopago.com/authorization` |
| `client_id` | `MERCADOPAGO_OAUTH_CLIENT_ID` |
| `response_type` | `code` |
| `platform_id` | `mp` |
| `redirect_uri` | `getMercadoPagoOAuthRedirectUri()` (ver abajo) |
| `state` | aleatorio (un solo uso, ~10 min) |
| `scope` | `offline_access payments write` |
| `code_challenge` / `code_challenge_method` | PKCE **S256** (siempre enviados) |
| `prompt` | Solo si start trae `reconnect=1`: `login` — **no documentado por MP** (best-effort) |

### `reconnect=1` en oauth/start (otra cuenta MP)

```http
GET /api/mercadopago/oauth/start?negocioId=<uuid>&redirectTo=<path>&reconnect=1
```

Cliente (Fran): `buildMercadoPagoOAuthStartPath(negocioId, redirectTo, { reconnect: true })` — **no** hace unlink en el browser; el servidor desvincula.

Con `reconnect=1`, antes de PKCE/state: `disconnectNegocioMercadoPagoOAuth` (revoke best-effort + borrado Supabase). Luego authorize con `prompt=login`. Sin el flag: primer vínculo, sin disconnect ni `prompt`.

MP no documenta `prompt` ni logout OAuth. Fallback: cerrar sesión en MP o incógnito.

Parser: `lib/mercadopago/oauth-reconnect.ts`.

**Alias deprecado (un release):** `forceAccountSelect=1` (#28) se trata igual que `reconnect=1`. Cliente nuevo (#30): solo `reconnect=1` / `onConnect({ reconnect: true })`.

**Ejemplo** (secretos enmascarados):

```http
https://auth.mercadopago.com/authorization?client_id=************3456&response_type=code&platform_id=mp&redirect_uri=https%3A%2F%2Fwww.pagolisto.com.ar%2Fapi%2Fmercadopago%2Foauth%2Fcallback&state=a1b2c3…&scope=offline_access+payments+write&code_challenge=E9Melhoa2OwvFrEMTgu…&code_challenge_method=S256
```

Para inspeccionar en producción: DevTools → pestaña **Red** → clic en «Conectar MP» → respuesta `302` de `/api/mercadopago/oauth/start` → header `Location` (ahí está el `redirect_uri` real que ve MP).

## URL canónica del sitio

- **`NEXT_PUBLIC_SITE_URL`**: usar el host **final** donde vive la app con sesión Supabase, en producción:
  - **`https://www.pagolisto.com.ar`** (recomendado si el apex redirige a www).
- El **Redirect URI** de OAuth y el **`notification_url`** de Checkout Pro deben usar el **mismo host** que `NEXT_PUBLIC_SITE_URL` (MP no sigue redirects en webhooks).

## Redirect URIs en el panel de la app MP

Registrar **exactamente** (sin barra final extra) las URLs de callback que vayan a usarse:

| Entorno | Redirect URI |
| ------- | ------------- |
| Producción (www) | `https://www.pagolisto.com.ar/api/mercadopago/oauth/callback` |
| Producción (apex, solo si sirve la app sin redirect) | `https://pagolisto.com.ar/api/mercadopago/oauth/callback` |
| Local | `http://localhost:3000/api/mercadopago/oauth/callback` |
| Ngrok / preview | `https://<túnel>/api/mercadopago/oauth/callback` |

Opcional: fijar explícitamente en Vercel **`MERCADOPAGO_OAUTH_REDIRECT_URI`** igual al valor registrado en MP (debe coincidir byte a byte con el authorize).

**Prioridad en código:** si `MERCADOPAGO_OAUTH_REDIRECT_URI` está definida (aunque sea distinta de `NEXT_PUBLIC_SITE_URL`), **el authorize usa solo el override**. Un override viejo (localhost, ngrok, apex sin registrar) con `NEXT_PUBLIC_SITE_URL` en www produce el error de MP antes del login. Tras cambiar env en Vercel, **redeploy**; si usás `NEXT_PUBLIC_SITE_URL` para derivar el callback, también hace falta rebuild porque es `NEXT_PUBLIC_*`.

## Variables de entorno (OAuth tienda)

| Variable | Obligatoria | Notas |
| -------- | ----------- | ----- |
| `MERCADOPAGO_OAUTH_CLIENT_ID` | Sí | Client ID de la aplicación MP |
| `MERCADOPAGO_OAUTH_CLIENT_SECRET` | Sí | Solo servidor; nunca `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_SITE_URL` | Sí | Canónica; deriva redirect si no hay override |
| `MERCADOPAGO_OAUTH_REDIRECT_URI` | No | Override del callback; debe = panel MP |
| `MERCADOPAGO_OAUTH_BROWSER_RETURN_ORIGIN` | Solo `next dev` | Tras OAuth, navegador vuelve aquí (cookies Supabase). Default `http://localhost:3000` |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Callback/status guardan tokens vía admin client |

## Apex vs www

- Si los usuarios entran por **`pagolisto.com.ar`** pero MP redirige al callback en **`www`**, la app redirige el post-consent al origen de **`NEXT_PUBLIC_SITE_URL`** (www) para mantener sesión y flash `mp_oauth=ok`.
- Ideal: redirect HTTP **apex → www** en el CDN y una sola URL canónica en env + un solo Redirect URI en MP.
- Si hace falta soportar ambos hosts activos, registrar **ambos** Redirect URIs en MP y alinear `MERCADOPAGO_OAUTH_REDIRECT_URI` con el que use el flujo authorize.

## Scopes y PKCE

- Authorize usa **`offline_access payments write`** + **PKCE S256** (state de un solo uso en `mp_oauth_states`).
- En el panel MP: si habilitaste **Authorization code con PKCE**, los campos `code_challenge` / `code_method` son obligatorios (PagoListo ya los envía).
- Tras conectar, validar en **Configuración** o `GET /api/mercadopago/oauth/status?negocioId=…` → `connected: true` (sin tokens en la respuesta).

## «La aplicación no puede conectarse a tu cuenta» (pantalla de MP, sin login)

Este mensaje aparece **en Mercado Pago**, antes de volver a PagoListo. No es un `mp_oauth=error` de nuestra app. Según [documentación MP](https://developers.mercadolibre.com.ar/es_ar/autenticacion-y-autorizacion), revisar en orden:

1. **`redirect_uri`** en la URL de authorize = **exactamente** una URL registrada en *URLs de redireccionamiento* (protocolo, host, ruta, sin query; sin barra final de más). Producción esperada: `https://www.pagolisto.com.ar/api/mercadopago/oauth/callback`.
2. **`client_id` / `client_secret`** válidos y de la **app OAuth tienda** (no SaaS).
3. Vendedor entra con la **cuenta principal**, no colaborador.
4. Cuenta vendedor o titular de la app sin validaciones pendientes / inhabilitaciones.
5. **Prod vs prueba:** app y cuentas en el mismo modo (no autorizar producción con app de prueba).

Si el authorize en `Location` muestra un `redirect_uri` distinto al panel MP, corregir Vercel (`MERCADOPAGO_OAUTH_REDIRECT_URI` o `NEXT_PUBLIC_SITE_URL` + rebuild) y el panel MP, luego redeploy.

Los logs de Vercel en `/api/mercadopago/oauth/start` incluyen `[mp-oauth] MERCADOPAGO_OAUTH_REDIRECT_URI … no alinea` cuando el override contradice `NEXT_PUBLIC_SITE_URL`.

## Errores recuperables

Ver [`mercadopago-oauth-errores.md`](./mercadopago-oauth-errores.md). Nunca se exponen `access_token` / `refresh_token` al navegador.

## Migraciones Supabase

Aplicar migraciones incl. **`20260915210000_mp_cobro_oauth_security.sql`** y **`20260916120000_mp_oauth_token_lockdown_harden.sql`** para revocar GRANT y eliminar políticas owner en `negocio_mercadopago_oauth`.

**Verificación post-migración** (SQL editor Supabase):

```sql
-- Debe devolver 0 filas para anon/authenticated:
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'negocio_mercadopago_oauth'
  AND grantee IN ('anon', 'authenticated');

-- Debe devolver 0 filas (sin políticas client-side):
SELECT polname FROM pg_policy
WHERE polrelid = 'public.negocio_mercadopago_oauth'::regclass;
```

**Estado observado en prod (Pagolisto) antes del fix GAE-8:** GRANT SELECT a `anon`/`authenticated` y políticas `*_owner` activas → cualquier propietario autenticado podía leer `access_token` vía supabase-js. Las migraciones del repo `20260915*` / `20260916*` no estaban aplicadas en el proyecto remoto (solo migraciones con timestamp distinto).
