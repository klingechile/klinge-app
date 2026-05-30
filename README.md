# Klinge Ventas Admin — Railway MVP

Panel interno para gestionar ventas Shopify, comprobantes por aprobar, facturación y apoyo comercial a vendedores.

## Alcance del MVP

- Servidor Node mínimo para Railway.
- Healthcheck en `/health`.
- Basic Auth en producción.
- Frontend estático servido desde `/public`.
- Importación CSV Shopify desde navegador.
- Consolidación de órdenes por ID/Name.
- KPIs básicos de ventas, comprobantes y facturación.
- Datos guardados temporalmente en `localStorage` para validar flujo.

## Fuera del MVP

- Persistencia en base de datos.
- Login por roles.
- Sincronización directa con Shopify API.
- Integración real Lioren.
- Gestión documental real de comprobantes.

## Variables Railway

Configurar en Railway:

```env
NODE_ENV=production
ADMIN_USER=admin
ADMIN_PASSWORD=usar_una_clave_segura
```

Opcional para fases posteriores:

```env
LUMI_API_BASE=https://lumi-klinge-bot-production.up.railway.app
LUMI_ADMIN_KEY=usar_solo_si_se_agrega_proxy_backend
ALLOWED_ORIGIN=https://app.klinge.cl
```

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

## Siguiente fase

- Crear backend persistente con DB.
- Crear tabla `sales` y `sale_items`.
- Guardar importaciones CSV.
- Conectar Shopify Admin API.
- Crear módulo real de comprobantes.
- Mantener integración de facturación con Lioren.
