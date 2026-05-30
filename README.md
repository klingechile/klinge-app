# Klinge Ventas Admin — Railway PostgreSQL MVP

Panel interno para gestionar ventas Shopify, comprobantes por aprobar, facturación y apoyo comercial a vendedores.

## Alcance del MVP

- Servidor Node mínimo para Railway.
- Healthcheck en `/health`.
- Basic Auth en producción.
- Frontend estático servido desde `/public`.
- Importación CSV Shopify desde navegador.
- Consolidación de órdenes por ID/Name.
- Persistencia directa en Railway PostgreSQL usando `DATABASE_URL`.
- Creación automática del esquema al iniciar el servidor.
- KPIs básicos de ventas, comprobantes y facturación.
- Aprobación de comprobantes.
- Marcado simple de facturación.

## Seguridad

- El navegador no recibe credenciales de base de datos.
- El frontend llama a `/api/*`.
- El backend usa `DATABASE_URL` solo desde Railway.
- Usar `DATABASE_URL` para la app productiva.
- No usar `DATABASE_PUBLIC_URL` dentro de la app productiva salvo para pruebas externas puntuales.

## Fuera del MVP

- Login por roles.
- Sincronización directa con Shopify API.
- Integración real Lioren.
- Gestión documental real de comprobantes.
- Carga real de archivos PDF/JPG de comprobantes.

## Variables Railway

Railway entrega estas variables al agregar PostgreSQL al proyecto. Para la app solo necesitas que el servicio tenga acceso a:

```env
NODE_ENV=production
ADMIN_USER=admin
ADMIN_PASSWORD=usar_una_clave_segura
DATABASE_URL=postgresql://...
```

Variables como `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` y `PGPORT` son útiles para conexión manual, pero el backend usa `DATABASE_URL`.

Opcional para fases posteriores:

```env
LUMI_API_BASE=https://lumi-klinge-bot-production.up.railway.app
LUMI_ADMIN_KEY=usar_solo_si_se_agrega_proxy_backend
ALLOWED_ORIGIN=https://app.klinge.cl
```

## Base de datos

El servidor crea automáticamente estas tablas si no existen:

- `sales`
- `sale_items`
- `payment_proofs`
- `invoices`

También crea índices mínimos para búsqueda por orden, estados, facturación y fecha Shopify.

## Ejecutar local

```bash
npm install
npm run check
npm start
```

Para probar local contra Railway PostgreSQL puedes usar `DATABASE_PUBLIC_URL` temporalmente en tu terminal local:

```bash
DATABASE_URL="pegar_database_public_url_solo_local" npm start
```

En Railway productivo usa `DATABASE_URL`, no `DATABASE_PUBLIC_URL`.

Abrir:

```txt
http://localhost:3000
```

En local no se exige Basic Auth. En Railway, con `NODE_ENV=production`, sí se exige usuario y contraseña.

## Railway

1. Crear proyecto en Railway.
2. Agregar servicio PostgreSQL.
3. Conectar el repo `klingechile/klinge-app`.
4. Seleccionar rama `feature/klinge-sales-admin-railway-mvp` para validar MVP.
5. Confirmar que la app tenga `DATABASE_URL` disponible.
6. Agregar `NODE_ENV`, `ADMIN_USER` y `ADMIN_PASSWORD`.
7. Deploy.
8. Validar `/health`.
9. Abrir dominio generado por Railway.
10. Importar CSV Shopify desde el panel.
11. Validar datos persistidos en Railway PostgreSQL.

## Endpoints MVP

```txt
GET /api/status
GET /api/sales
POST /api/shopify/import-csv
PATCH /api/payment-proofs/:externalOrderId/approve
PATCH /api/invoices/:externalOrderId/mark-issued
```

## Siguiente fase

- Conectar Shopify Admin API.
- Agregar vendedores reales.
- Agregar asignación de vendedor por venta.
- Agregar carga real de comprobantes.
- Conectar facturación Lioren.
- Agregar roles y auditoría.
