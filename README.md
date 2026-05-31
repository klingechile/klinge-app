# Klinge Ventas Admin — Railway MVP

Panel interno para gestionar ventas Shopify, comprobantes por aprobar, facturación y apoyo comercial a vendedores.

## Alcance del MVP

- Servidor Node mínimo para Railway.
- Healthcheck en `/health`.
- Basic Auth en producción.
- Frontend estático servido desde `/public`.
- Importación CSV Shopify desde navegador.
- Consolidación de órdenes por ID/Name.
- Lectura de datos operativos de Shopify: cliente, email, teléfono, RUT desde notas, empresa, dirección, comuna/ciudad, región, productos, SKU, cantidades, método de pago, referencias, descuentos, despacho y estado DTE.
- KPIs básicos de ventas, comprobantes y facturación.
- Datos guardados temporalmente en `localStorage` para validar flujo.

## Importar ventas Shopify

1. En Shopify, exportar órdenes en CSV.
2. Abrir el módulo **Importar Shopify**.
3. Subir el archivo `orders_export.csv`.
4. El sistema agrupa líneas por orden y actualiza la sección **Ventas**.

Columnas mínimas esperadas:

```txt
Name, Id, Email, Financial Status, Fulfillment Status, Total, Created at, Lineitem quantity, Lineitem name, Lineitem price, Payment Method
```

También se aprovechan, cuando están disponibles:

```txt
Billing Name, Billing Phone, Billing Company, Billing City, Billing Province Name, Shipping Name, Shipping Phone, Shipping City, Shipping Province Name, Shipping Method, Discount Code, Discount Amount, Notes, Payment Reference, Payment ID, Payment References, Lineitem sku, Lineitem compare at price
```

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
4. Seleccionar rama `main` para validar el MVP legacy.
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
