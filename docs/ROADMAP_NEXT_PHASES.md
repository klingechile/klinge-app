# Roadmap siguientes fases — Klinge Ventas Admin

## Estado actual

La aplicación ya cuenta con:

- Deploy en Railway.
- Healthcheck operativo.
- Railway PostgreSQL conectado.
- Esquema base creado automáticamente.
- Importación CSV Shopify.
- Preparación para sincronización Shopify API.
- Comprobantes básicos por aprobar.
- Facturación básica.
- Dashboard comercial inicial.

## Fase 1 — Estabilización de sincronización Shopify

Objetivo: dejar la sincronización directa con Shopify lista para operación diaria.

Alcance:

- Validar variables reales de Railway.
- Confirmar `shopifyConfigured: true` en `/health`.
- Probar `POST /api/shopify/sync-orders`.
- Registrar cantidad de órdenes leídas, nuevas y actualizadas.
- Evitar duplicados por orden.
- Mantener CSV como respaldo manual.

Criterios de aceptación:

- El botón Sincronizar Shopify API trae órdenes recientes.
- Las ventas quedan en Railway PostgreSQL.
- Una segunda sincronización no duplica ventas.
- Se actualizan estados de pago y despacho.

## Fase 2 — Vendedores y asignación comercial

Objetivo: convertir la app en herramienta de venta y asesoría, no solo reportería.

Alcance:

- Crear vendedores reales.
- Asignar venta a vendedor.
- Registrar estado comercial.
- Registrar próxima acción.
- Registrar observaciones del vendedor.
- Reportar ventas por vendedor.

Estados comerciales sugeridos:

- Nueva venta.
- En asesoría.
- Esperando comprobante.
- Comprobante recibido.
- Lista para facturar.
- Facturada.
- Pendiente despacho.
- Cerrada.
- Postventa.

## Fase 3 — Comprobantes reales

Objetivo: controlar pagos manuales y aprobaciones.

Alcance:

- Cargar comprobante PDF/JPG/PNG.
- Guardar archivo en storage.
- Asociar comprobante a venta.
- Aprobar o rechazar comprobante.
- Registrar motivo de rechazo.
- Registrar monto declarado.
- Registrar banco/referencia.

Criterios de aceptación:

- Una venta por transferencia queda como comprobante pendiente.
- Al aprobar, pasa a lista para facturar.
- Al rechazar, queda bloqueada para facturación.

## Fase 4 — Facturación Lioren

Objetivo: mantener la facturación dentro del flujo operativo.

Alcance:

- Tomar ventas pagadas/listas para facturar.
- Enviar datos a Lioren.
- Guardar tipo DTE.
- Guardar folio.
- Guardar PDF.
- Guardar errores de emisión.
- Permitir reintento.

Criterios de aceptación:

- Una venta lista para facturar emite documento.
- El folio y PDF quedan asociados a la venta.
- Los errores quedan visibles para corrección.

## Fase 5 — Reportes gerenciales

Objetivo: entregar vista ejecutiva para decisiones comerciales.

Reportes mínimos:

- Ventas por día/semana/mes.
- Ventas por vendedor.
- Ventas por producto.
- Ventas por método de pago.
- Ventas por estado de despacho.
- Ventas pendientes de comprobante.
- Ventas pendientes de facturación.
- Ticket promedio.
- Productos más vendidos.

## Fase 6 — Seguridad y usuarios

Objetivo: reemplazar Basic Auth por control de usuarios y roles.

Roles sugeridos:

- Admin.
- Ventas.
- Facturación.
- Solo lectura.

Alcance:

- Login formal.
- Roles.
- Auditoría de acciones.
- Registro de quién aprobó comprobante.
- Registro de quién facturó.
- Registro de quién asignó vendedor.

## Fase 7 — Automatizaciones comerciales

Objetivo: activar acciones de seguimiento comercial.

Alcance:

- Alertas por comprobantes pendientes.
- Alertas por ventas pagadas no facturadas.
- Alertas por ventas pagadas no despachadas.
- Seguimiento por vendedor.
- Tareas comerciales vencidas.
- Recompra o upsell.

## Orden recomendado

1. Estabilizar sincronización Shopify.
2. Agregar vendedores/asignación.
3. Mejorar comprobantes.
4. Conectar Lioren.
5. Fortalecer reportes.
6. Agregar usuarios/roles.
7. Automatizaciones comerciales.
