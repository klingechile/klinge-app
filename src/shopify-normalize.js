function numberOrZero(value) {
  const parsed = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeShopifyOrder(order) {
  const billing = order.billing_address || {};
  const shipping = order.shipping_address || {};
  const paymentMethod = Array.isArray(order.payment_gateway_names) && order.payment_gateway_names.length
    ? order.payment_gateway_names.join(", ")
    : (order.gateway || "Sin método");

  return {
    source: "shopify",
    id: String(order.id),
    name: order.name || String(order.id),
    email: order.email || order.contact_email || "",
    customer: billing.name || shipping.name || order.email || "Cliente sin nombre",
    phone: billing.phone || shipping.phone || order.phone || "",
    city: shipping.city || billing.city || "",
    region: shipping.province || billing.province || "",
    financialStatus: order.financial_status || "unknown",
    fulfillmentStatus: order.fulfillment_status || "unfulfilled",
    paymentMethod,
    paymentReference: order.reference || order.confirmation_number || "",
    total: numberOrZero(order.current_total_price || order.total_price),
    subtotal: numberOrZero(order.current_subtotal_price || order.subtotal_price),
    shipping: numberOrZero(order.total_shipping_price_set?.shop_money?.amount),
    taxes: numberOrZero(order.current_total_tax || order.total_tax),
    createdAt: order.created_at || order.processed_at || "",
    paidAt: order.processed_at || "",
    notes: order.note || "",
    riskLevel: "",
    invoiceStatus: String(order.financial_status || "").toLowerCase() === "paid" ? "pendiente" : "no lista",
    items: (order.line_items || []).map((item) => ({
      name: item.name || item.title || "Producto sin nombre",
      sku: item.sku || "",
      quantity: numberOrZero(item.quantity || 1),
      unitPrice: numberOrZero(item.price)
    }))
  };
}
