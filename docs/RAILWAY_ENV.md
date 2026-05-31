# Variables Railway — Klinge App migrada

## Requeridas

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_USER=admin
ADMIN_PASSWORD=change_me
```

## Integraciones proxy backend

Estas variables quedan solo en Railway. No deben estar en el HTML.

```env
LUMI_API_BASE=https://lumi-klinge-bot-production.up.railway.app
LUMI_ADMIN_KEY=change_me
DTE_API_BASE=https://generar-dte-production.up.railway.app
ANTHROPIC_API_KEY=change_me
```

## Validación

Después del deploy:

```txt
/health
```

Debe responder:

```json
{
  "status": "ok",
  "service": "klinge-app",
  "database": true
}
```

## Endpoints internos

```txt
GET    /api/data/ventas
GET    /api/data/clientes
GET    /api/data/gastos
GET    /api/data/cobros
POST   /api/data/ventas
PATCH  /api/data/ventas/:id
DELETE /api/data/recordatorios/:id
POST   /api/lumi/message
POST   /api/dte/facturas
POST   /api/ai/messages
```

## Notas

- No usar claves Supabase en frontend.
- No usar `x-admin-key` de Lumi en frontend.
- No usar Anthropic API key desde navegador.
- No usar `DATABASE_PUBLIC_URL` dentro de la app productiva.
