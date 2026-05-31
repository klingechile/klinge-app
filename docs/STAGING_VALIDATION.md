# Validación Staging — Railway PostgreSQL

## Rama

```txt
feature/netlify-frontend-railway-postgres
```

## Precondiciones

- HTML productivo parcheado subido como `public/index.html`.
- Base Supabase restaurada en Railway PostgreSQL.
- Variables Railway configuradas.
- Deploy Railway exitoso.

## Variables mínimas

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_USER=admin
ADMIN_PASSWORD=********
LUMI_API_BASE=https://lumi-klinge-bot-production.up.railway.app
LUMI_ADMIN_KEY=********
DTE_API_BASE=https://generar-dte-production.up.railway.app
ANTHROPIC_API_KEY=********
```

## Smoke test técnico

```bash
ADMIN_USER="admin" \
ADMIN_PASSWORD="********" \
scripts/validate/smoke-railway.sh https://TU-APP.up.railway.app
```

## Endpoints esperados

```txt
/health
/api/admin/db/status
/api/admin/db/counts
/api/data/ventas?limit=3
/api/data/clientes?limit=3
/rest/v1/ventas?select=*&limit=3
/
```

## Conteos esperados mínimos

```txt
ventas: 98
clientes: 79
gastos: 124
cobros: 26
productos: 18
vendedores: 5
user_pins: 6
user_permissions: 7
app_config: 20
social_mensajes: 769
crm_message_queue: 281
```

## Validación funcional manual

- [ ] Login carga correctamente.
- [ ] Dashboard muestra KPIs.
- [ ] Ventas carga registros.
- [ ] Clientes carga registros.
- [ ] Gastos carga registros.
- [ ] Cobros carga registros.
- [ ] Comisiones no rompe.
- [ ] Configuración carga usuarios/permisos.
- [ ] Config Lumi carga productos/configuración.
- [ ] Lumi WA/IG carga conversaciones.
- [ ] Crear/editar venta de prueba funciona.
- [ ] Crear/editar gasto de prueba funciona.
- [ ] Actualizar un cobro de prueba funciona.
- [ ] DTE responde desde `/api/dte/facturas`.
- [ ] Lumi responde desde `/api/lumi/message`.
- [ ] IA responde desde `/api/ai/messages`.

## Regla de corte

No apuntar `app.klinge.cl` a Railway hasta que:

1. Los conteos coincidan.
2. El login funcione.
3. Dashboard/Ventas/Gastos/Cobros funcionen.
4. No existan errores críticos en consola del navegador.
5. Se haya realizado una prueba de escritura controlada.
