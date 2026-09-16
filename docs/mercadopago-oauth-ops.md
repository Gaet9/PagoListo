# Mercado Pago OAuth — checklist de operaciones (PagoListo)

Checklist para Gaétan / Armando al configurar la app en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers) y variables en Vercel.

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
- Tras conectar, validar en **Configuración** o `GET /api/mercadopago/oauth/status?negocioId=…` → `connected: true` (sin tokens en la respuesta).

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
