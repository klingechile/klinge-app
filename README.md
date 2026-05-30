# Klinge Ventas Admin — Railway + Supabase MVP

Panel interno para gestionar ventas Shopify, comprobantes por aprobar, facturación y apoyo comercial a vendedores.

## Alcance del MVP

- Servidor Node mínimo para Railway.
- Healthcheck en `/health`.
- Basic Auth en producción.
- Frontend estático servido desde `/public`.
- Importación CSV Shopify desde navegador.
- Consolidación de órdenes por ID/Name.
- Persistencia en Supabase usando backend Node.
- KPIs básicos de ventas, comprobantes y facturación.
- Aprobación de comprobantes.
- Marcado simple de facturación.

## Seguridad

- El navegador no recibe `SUPABASE_SERVICE_ROLE_KEY`.
- El frontend llama a `/api/*`.
- El backend usa `SUPABASE_SERVICE_ROLE_KEY` solo desde Railway.
- Las tablas quedan con RLS habilitado.
- No se crean policies públicas en el MVP.

## Fuera del MVP

- Login por roles.
- Sincronización directa con Shopify API.
- Integración real Lioren.
- Gestión documental real de comprobantes.
- Carga real de archivos PDF/JPG de comprobantes.

## Variables Railway

Configurar en Railway:

```env
NODE_ENV=production
ADMIN_USER=admin
ADMIN_PASSWORD=usar_una_clave_segura
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=usar_service_role_key
```

Opcional para fases posteriores:

```env
LUMI_API_BASE=https://lumi-klinge-bot-production.up.railway.app
LUMI_ADMIN_KEY=usar_solo_si_se_agrega_proxy_backend
ALLOWED_ORIGIN=https://app.klinge.cl
```

## Supabase

Aplicar la migración:

```txt
supabase/migrations/20260530_create_sales_admin_tables.sql
```

Tablas creadas:

- `sales`
- `sale_items`
- `payment_proofs`
- `invoices`

Todas quedan con RLS habilitado. El acceso operativo lo realiza el backend con service role desde Railway.

## Ejecutar local

```bash
npm install
npm run check
npm start
```

Abrir:

```txt
http://localhost:3000
```

En local no se exige Basic Auth. En Railway, con `NODE_ENV=production`, sí se exige usuario y contraseña.

## Railway

1. Crear cuenta/proyecto en Railway.
2. New Project → Deploy from GitHub repo.
3. Elegir `klingechile/klinge-app`.
4. Seleccionar rama `feature/klinge-sales-admin-railway-mvp` para validar MVP.
5. Agregar variables de entorno.
6. Deploy.
7. Validar `/health`.
8. Abrir dominio generado por Railway.
9. Importar CSV Shopify desde el panel.
10. Validar datos persistidos en Supabase.

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
- Agregar carga real de comprobantes a Supabase Storage.
- Conectar facturación Lioren.
- Agregar roles y auditoría.
