# Shopify sync setup

Variables requeridas en Railway para sincronizar ordenes desde Shopify Admin API:

```env
SHOPIFY_SHOP_DOMAIN=klinge.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxx
SHOPIFY_API_VERSION=2026-01
```

Permisos minimos del Custom App:

- read_orders
- read_customers si se requiere informacion completa del cliente
- read_all_orders solo si se necesita mas de 60 dias de historial

El backend debe llamar al endpoint interno:

```txt
POST /api/shopify/sync-orders
```

La respuesta esperada debe incluir ventas nuevas, actualizadas y ordenes leidas desde Shopify.
