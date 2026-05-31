export const ALLOWED_TABLES = new Set([
  "ventas",
  "clientes",
  "gastos",
  "cobros",
  "productos",
  "vendedores",
  "user_pins",
  "user_permissions",
  "app_config",
  "klinge_leads",
  "leads",
  "recordatorios",
  "inventario",
  "contenido",
  "comisiones",
  "terreno",
  "lumi_config",
  "lumi_productos",
  "lumi_conversaciones",
  "social_conversaciones",
  "social_mensajes",
  "shopify_orders",
  "shopify_carts",
  "shopify_products",
  "crm_communication_history",
  "crm_message_queue",
  "ventas_dte_log"
]);

export const PRIMARY_KEYS = {
  app_config: "key",
  user_pins: "user_id",
  user_permissions: "user_id"
};

export const DEFAULT_ORDER = {
  user_pins: "updated_at",
  user_permissions: "updated_at",
  vendedores: "created_at",
  ventas: "created_at",
  clientes: "created_at",
  gastos: "created_at",
  productos: "created_at",
  cobros: "created_at",
  app_config: "updated_at",
  recordatorios: "created_at",
  leads: "created_at",
  inventario: "created_at",
  contenido: "created_at",
  comisiones: "created_at",
  terreno: "created_at",
  lumi_conversaciones: "created_at",
  klinge_leads: "created_at",
  social_conversaciones: "ultimo_mensaje_at",
  social_mensajes: "created_at",
  lumi_config: "updated_at",
  lumi_productos: "orden",
  shopify_orders: "created_at",
  shopify_carts: "created_at",
  shopify_products: "created_at",
  crm_communication_history: "created_at",
  crm_message_queue: "created_at",
  ventas_dte_log: "created_at"
};

export function getPrimaryKey(table) {
  return PRIMARY_KEYS[table] || "id";
}

export function assertAllowedTable(table) {
  if (!ALLOWED_TABLES.has(table)) {
    const error = new Error(`Table not allowed: ${table}`);
    error.status = 403;
    throw error;
  }
}

export function safeIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value || "")) {
    const error = new Error(`Invalid identifier: ${value}`);
    error.status = 400;
    throw error;
  }
  return value;
}
