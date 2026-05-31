# Migración Supabase → Railway PostgreSQL

## Objetivo

Mover la data productiva de Supabase a PostgreSQL en Railway sin pérdida de información.

## Principio

Primero se migra y valida la base. Después se cambia el frontend para leer desde backend Railway.

No se debe cortar producción hasta validar conteos y funcionalidades críticas.

## Supabase origen

Proyecto detectado:

```txt
Nombre: klingechile
Project ID: nikmfrlvhmnjtwctwmid
PostgreSQL: 17
```

## Tablas críticas para app Klinge

```txt
ventas
clientes
gastos
cobros
productos
vendedores
user_pins
user_permissions
app_config
klinge_leads
leads
lumi_config
lumi_productos
social_conversaciones
social_mensajes
shopify_orders
shopify_carts
crm_communication_history
crm_message_queue
```

## Conteos actuales de referencia

```txt
social_mensajes              769
lumi_events                  661
lumi_customers               399
crm_message_queue            281
gastos                       124
ventas                        98
clientes                      79
shopify_carts                 79
crm_communication_history     29
cobros                        26
app_config                    20
productos                     18
lumi_productos                12
shopify_orders                 9
klinge_leads                   8
user_permissions               7
leads                          6
user_pins                      6
vendedores                     5
```

## Variables requeridas localmente

```bash
export SUPABASE_DATABASE_URL="postgresql://..."
export RAILWAY_DATABASE_URL="postgresql://..."
```

No usar `DATABASE_PUBLIC_URL` dentro de la app productiva. Para migración externa puede usarse temporalmente si Railway lo requiere desde tu equipo local.

## Paso 1 — Backup completo

```bash
mkdir -p backups

pg_dump "$SUPABASE_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="backups/klinge_supabase_$(date +%Y%m%d_%H%M%S).dump"
```

Backup SQL adicional legible:

```bash
pg_dump "$SUPABASE_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --file="backups/klinge_supabase_$(date +%Y%m%d_%H%M%S).sql"
```

## Paso 2 — Importar a Railway PostgreSQL

```bash
pg_restore \
  --dbname="$RAILWAY_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  backups/klinge_supabase_YYYYMMDD_HHMMSS.dump
```

## Paso 3 — Validar conteos

Ejecutar:

```bash
psql "$RAILWAY_DATABASE_URL" -f scripts/sql/validate-core-counts.sql
```

Comparar contra los conteos de Supabase.

## Paso 4 — Backend Railway

La app no debe consultar PostgreSQL directo desde el navegador.

Arquitectura objetivo:

```txt
Frontend HTML
↓
Backend Railway /api/*
↓
Railway PostgreSQL
```

## Paso 5 — Reemplazo gradual de Supabase frontend

Cambiar helpers del HTML productivo:

```txt
sbGet()
sbInsert()
sbUpdate()
sbDelete()
sbUpsert()
```

Para que apunten a endpoints internos:

```txt
GET    /api/data/:table
POST   /api/data/:table
PATCH  /api/data/:table/:id
DELETE /api/data/:table/:id
```

## Checklist de corte

```txt
[ ] Backup .dump generado
[ ] Backup .sql generado
[ ] Restore en Railway exitoso
[ ] Conteos core validados
[ ] Login validado
[ ] Dashboard validado
[ ] Ventas validadas
[ ] Clientes validados
[ ] Gastos validados
[ ] Cobros validados
[ ] Comisiones validadas
[ ] Lumi validado
[ ] DTE validado
[ ] Producción apunta a Railway
```
