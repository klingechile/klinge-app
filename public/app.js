const STORAGE_KEY = "klinge_sales_admin_mvp";

const sampleCsv = `Name,Email,Financial Status,Paid at,Fulfillment Status,Fulfilled at,Accepts Marketing,Currency,Subtotal,Shipping,Taxes,Total,Discount Code,Discount Amount,Shipping Method,Created at,Lineitem quantity,Lineitem name,Lineitem price,Lineitem compare at price,Lineitem sku,Lineitem requires shipping,Lineitem taxable,Lineitem fulfillment status,Billing Name,Billing Street,Billing Address1,Billing Address2,Billing Company,Billing City,Billing Zip,Billing Province,Billing Country,Billing Phone,Shipping Name,Shipping Street,Shipping Address1,Shipping Address2,Shipping Company,Shipping City,Shipping Zip,Shipping Province,Shipping Country,Shipping Phone,Notes,Payment Method,Payment Reference,Refunded Amount,Vendor,Outstanding Balance,Id,Tags,Risk Level,Source,Lineitem discount,Billing Province Name,Shipping Province Name,Payment ID,Payment Terms Name,Next Payment Due At,Payment References
1044,onlysport.illapel@gmail.com,paid,2025-10-02 17:09:34 -0300,fulfilled,2025-10-02 17:09:35 -0300,yes,CLP,163056,1,30981,194038,KLIN5000,5000,Envío a Regiones con Chilexpress – Cobro en destino,2025-10-02 17:09:33 -0300,2,Pantalla LED Publicitaria 60x90 cm – Atrae Más Clientes + Impresión GRATIS - Con Impresión Incluida (Cliente envía el Diseño),84028,159990,,true,true,fulfilled,Paulina Nuñez,Constitución 14,Constitución 14,,,Illapel,'1930000,CO,CL,+56978035645,Paulina Nuñez,Constitución 14,Constitución 14,,,Illapel,'1930000,CO,CL,+56978035645,"Documento emitido en Lioren\nTipo DTE: \nFolio: \nPDF: ",Mercado Pago Checkout Pro,rnmk1bigAIyDQ3iTLn8TCFljJ,0,Klinge,0,6866149310695,,Low,web,0,Coquimbo,Coquimbo,rnmk1bigAIyDQ3iTLn8TCFljJ,,,rnmk1bigAIyDQ3iTLn8TCFljJ
1045,roaguzmaneve@gmail.com,paid,2025-10-08 21:24:40 -0300,fulfilled,2025-10-08 21:24:41 -0300,yes,CLP,117647,1,22353,140001,,0,Envío a Regiones con Chilexpress – Cobro en destino,2025-10-08 21:24:39 -0300,1,Máquina de Milkshake Doble Klinge – Potencia Profesional para Tu Negocio - 23 x 23 x 53 cm,117647,300000,MK-1002,true,true,fulfilled,Evelyn Roa Guzmán,"3 poniente 555, local 2","3 poniente 555, local 2",,Grido,Viña del Mar,,VS,CL,+56961502930,Evelyn Roa Guzmán,"3 poniente 555, local 2","3 poniente 555, local 2",,Grido,Viña del Mar,,VS,CL,+56961502930,"Rut: 78.222.515-4\nInversiones Soul SpA",Mercado Pago Checkout Pro,ralfsqfqcM1OoXXzYlvIbc6UE,0,Klinge,0,6877841653991,,Low,web,0,Valparaíso,Valparaíso,ralfsqfqcM1OoXXzYlvIbc6UE,,,ralfsqfqcM1OoXXzYlvIbc6UE`;

let state = loadState();

const sections = {
  dashboard: ["Panel de Ventas Klinge", "Control comercial de ventas, comprobantes, Shopify, vendedores y facturación."],
  sales: ["Ventas realizadas", "Consulta y seguimiento de ventas importadas desde Shopify."],
  import: ["Importar Shopify", "Carga CSV, valida órdenes y consolida ventas para gestión comercial."],
  proofs: ["Comprobantes", "Bandeja operativa para revisar pagos manuales y transferencias."],
  billing: ["Facturación", "Ventas pagadas listas para emisión o validación de DTE."],
  sellers: ["Vendedores", "Asesoría comercial, asignaciones y seguimiento de oportunidades."],
  reports: ["Reportes", "Lectura ejecutiva por método de pago, despacho y productos vendidos."]
};

function $(id) { return document.getElementById(id); }
function money(value) { return Number(value || 0).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }); }
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clean(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function cleanZip(value) {
  return clean(value).replace(/^'/, "");
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return {
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      proofStatus: parsed.proofStatus || {},
      importHistory: Array.isArray(parsed.importHistory) ? parsed.importHistory : []
    };
  } catch {
    return { sales: [], proofStatus: {}, importHistory: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quote && next === '"') {
      cell += '"';
      i++;
      continue;
    }
    if (char === '"') { quote = !quote; continue; }
    if (char === "," && !quote) { row.push(cell); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quote) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some(value => clean(value))) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    if (row.some(value => clean(value))) rows.push(row);
  }

  const headers = rows.shift()?.map(header => clean(header)) || [];
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function numberFrom(value) {
  const cleanNumber = String(value || "0").replace(/[^0-9.-]/g, "");
  return Number(cleanNumber || 0);
}

function field(row, ...names) {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && clean(value) !== "") return clean(value);
  }
  return "";
}

function normalizedStatus(value, fallback = "unknown") {
  return clean(value || fallback).toLowerCase();
}

function orderDisplayName(value, fallback) {
  const raw = clean(value || fallback);
  if (!raw) return "—";
  return raw.startsWith("#") ? raw : `#${raw}`;
}

function extractRut(notes) {
  const match = String(notes || "").match(/(?:rut|r\.u\.t\.?)[:\s]*([0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-?[0-9kK])/i);
  return match ? match[1].toUpperCase() : "";
}

function extractCompany(row, notes) {
  const company = field(row, "Billing Company", "Shipping Company");
  if (company) return company;

  const lines = String(notes || "")
    .split(/\r?\n/)
    .map(line => clean(line))
    .filter(Boolean)
    .filter(line => !/^rut\s*:/i.test(line));

  return lines.find(line => /spa|ltda|eirl|s\.a\.?|limitada|sociedad/i.test(line)) || "";
}

function inferInvoiceStatus(row) {
  const notes = String(row.Notes || "");
  const folioMatch = notes.match(/folio:[^\S\r\n]*([^\s\r\n]+)/i);
  if (folioMatch?.[1]) return "facturada";
  if (/pdf:[^\S\r\n]*https?:\/\//i.test(notes)) return "facturada";
  if (/lioren|dte|folio/i.test(notes)) return "revisar dte";
  if (normalizedStatus(row["Financial Status"]) === "paid") return "pendiente";
  return "no lista";
}

function normalizeOrders(rows) {
  const map = new Map();

  for (const row of rows) {
    const orderKey = field(row, "Id", "Order ID", "Order Id", "Name");
    if (!orderKey) continue;

    const name = orderDisplayName(field(row, "Name"), orderKey);
    const notes = row.Notes || "";

    if (!map.has(orderKey)) {
      const customer = field(row, "Billing Name", "Shipping Name", "Customer", "Email") || "Cliente sin nombre";
      const phone = field(row, "Billing Phone", "Shipping Phone", "Phone");
      const city = field(row, "Shipping City", "Billing City");
      const region = field(row, "Shipping Province Name", "Billing Province Name", "Shipping Province", "Billing Province");
      const address = field(row, "Shipping Street", "Shipping Address1", "Billing Street", "Billing Address1");
      const zip = cleanZip(field(row, "Shipping Zip", "Billing Zip"));

      map.set(orderKey, {
        id: orderKey,
        name,
        email: field(row, "Email"),
        customer,
        phone,
        rut: extractRut(notes),
        company: extractCompany(row, notes),
        acceptsMarketing: field(row, "Accepts Marketing"),
        billing: {
          name: field(row, "Billing Name"),
          address: field(row, "Billing Street", "Billing Address1"),
          address2: field(row, "Billing Address2"),
          company: field(row, "Billing Company"),
          city: field(row, "Billing City"),
          zip: cleanZip(field(row, "Billing Zip")),
          province: field(row, "Billing Province Name", "Billing Province"),
          country: field(row, "Billing Country"),
          phone: field(row, "Billing Phone")
        },
        shippingAddress: {
          name: field(row, "Shipping Name"),
          address,
          address2: field(row, "Shipping Address2"),
          company: field(row, "Shipping Company"),
          city,
          zip,
          province: region,
          country: field(row, "Shipping Country"),
          phone: field(row, "Shipping Phone")
        },
        city,
        region,
        address,
        zip,
        financialStatus: normalizedStatus(row["Financial Status"]),
        fulfillmentStatus: normalizedStatus(row["Fulfillment Status"], "unfulfilled"),
        paymentMethod: field(row, "Payment Method") || "Sin método",
        paymentReference: field(row, "Payment Reference", "Payment References", "Payment ID"),
        paymentTermsName: field(row, "Payment Terms Name"),
        total: numberFrom(row.Total),
        subtotal: numberFrom(row.Subtotal),
        shipping: numberFrom(row.Shipping),
        taxes: numberFrom(row.Taxes),
        discountCode: field(row, "Discount Code"),
        discountAmount: numberFrom(row["Discount Amount"]),
        refundedAmount: numberFrom(row["Refunded Amount"]),
        outstandingBalance: numberFrom(row["Outstanding Balance"]),
        currency: field(row, "Currency") || "CLP",
        shippingMethod: field(row, "Shipping Method"),
        createdAt: field(row, "Created at"),
        paidAt: field(row, "Paid at"),
        fulfilledAt: field(row, "Fulfilled at"),
        cancelledAt: field(row, "Cancelled at"),
        notes,
        noteAttributes: field(row, "Note Attributes"),
        vendor: field(row, "Vendor"),
        tags: field(row, "Tags"),
        riskLevel: field(row, "Risk Level"),
        source: field(row, "Source") || "shopify_csv",
        invoiceStatus: inferInvoiceStatus(row),
        items: []
      });
    }

    const sale = map.get(orderKey);
    const itemName = field(row, "Lineitem name", "Lineitem Name", "Product", "Product title");
    if (itemName) {
      sale.items.push({
        name: itemName,
        sku: field(row, "Lineitem sku", "SKU"),
        quantity: numberFrom(field(row, "Lineitem quantity", "Quantity") || 1),
        unitPrice: numberFrom(row["Lineitem price"]),
        compareAtPrice: numberFrom(row["Lineitem compare at price"]),
        discount: numberFrom(row["Lineitem discount"]),
        requiresShipping: field(row, "Lineitem requires shipping"),
        taxable: field(row, "Lineitem taxable"),
        fulfillmentStatus: field(row, "Lineitem fulfillment status")
      });
    }
  }

  return [...map.values()];
}

function isPaid(sale) {
  return sale.financialStatus === "paid";
}

function isCancelled(sale) {
  return sale.financialStatus === "voided" || Boolean(sale.cancelledAt);
}

function isManualPayment(sale) {
  const method = (sale.paymentMethod || "").toLowerCase();
  return method.includes("bank") || method.includes("deposit") || method.includes("transfer") || method.includes("transferencia") || method.includes("manual") || method.includes("comprobante");
}

function importSales(newSales, meta = {}) {
  const existing = new Map(state.sales.map(s => [s.id, s]));
  let added = 0;
  let updated = 0;

  for (const sale of newSales) {
    const current = existing.get(sale.id);
    if (current) {
      existing.set(sale.id, {
        ...current,
        ...sale,
        invoiceStatus: current.invoiceStatus === "facturada" ? current.invoiceStatus : sale.invoiceStatus
      });
      updated++;
    } else {
      existing.set(sale.id, sale);
      added++;
    }
  }

  state.sales = [...existing.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  state.importHistory = [
    {
      fileName: meta.fileName || "CSV Shopify",
      importedAt: new Date().toISOString(),
      rows: meta.rows || 0,
      orders: newSales.length,
      added,
      updated
    },
    ...state.importHistory.slice(0, 9)
  ];
  saveState();
  return { added, updated, total: state.sales.length };
}

function badge(text, type = "blue") {
  return `<span class="badge ${type}">${esc(text || "—")}</span>`;
}

function paymentBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return badge("Pagada", "green");
  if (s === "voided") return badge("Anulada", "red");
  if (s === "pending" || s === "authorized") return badge("Pendiente", "yellow");
  return badge(status || "Pendiente", "yellow");
}

function fulfillmentBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "fulfilled") return badge("Despachada", "green");
  if (s === "partial") return badge("Parcial", "yellow");
  if (s === "unfulfilled") return badge("Pendiente", "yellow");
  return badge(status || "—", "blue");
}

function invoiceBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "facturada") return badge("Facturada", "green");
  if (s === "pendiente") return badge("Pendiente", "yellow");
  if (s === "revisar dte") return badge("Revisar DTE", "yellow");
  return badge(status || "No lista", "blue");
}

function renderAll() {
  renderDashboard();
  renderSales();
  renderProofs();
  renderBilling();
  renderSellers();
  renderReports();
}

function renderDashboard() {
  const sales = state.sales;
  const revenue = sales.filter(s => !isCancelled(s)).reduce((sum, s) => sum + Number(s.total || 0), 0);
  const proofs = sales.filter(s => isManualPayment(s) && (state.proofStatus[s.id] || "pendiente") !== "aprobado");
  const billing = sales.filter(s => isPaid(s) && s.invoiceStatus !== "facturada");

  $("kpiOrders").textContent = sales.length;
  $("kpiRevenue").textContent = money(revenue);
  $("kpiProofs").textContent = proofs.length;
  $("kpiBilling").textContent = billing.length;

  $("latestRows").innerHTML = sales.slice(0, 8).map(s => `
    <tr><td>${esc(s.name)}</td><td>${esc(s.customer)}</td><td>${money(s.total)}</td><td>${paymentBadge(s.financialStatus)}</td><td>${fulfillmentBadge(s.fulfillmentStatus)}</td></tr>
  `).join("") || `<tr><td colspan="5" class="empty">Importa ventas Shopify para iniciar.</td></tr>`;

  const tasks = [];
  if (proofs.length) tasks.push(`${proofs.length} comprobante(s) por aprobar.`);
  if (billing.length) tasks.push(`${billing.length} venta(s) lista(s) para facturación o revisión DTE.`);
  const pendingDispatch = sales.filter(s => isPaid(s) && s.fulfillmentStatus !== "fulfilled").length;
  if (pendingDispatch) tasks.push(`${pendingDispatch} venta(s) pagada(s) pendiente(s) de despacho.`);
  if (!tasks.length) tasks.push("Sin prioridades críticas. Importa ventas Shopify para revisar operación.");

  $("priorityList").innerHTML = tasks.map(t => `<li>${esc(t)}</li>`).join("");
}

function productSummary(sale) {
  return sale.items.map(item => {
    const sku = item.sku ? ` · SKU ${item.sku}` : "";
    return `${item.quantity}x ${item.name}${sku}`;
  }).join(", ") || "—";
}

function renderSales() {
  const term = ($("salesSearch")?.value || "").toLowerCase();
  const filtered = state.sales.filter(s => `${s.name} ${s.id} ${s.customer} ${s.company} ${s.rut} ${s.email} ${s.phone} ${s.city} ${s.region} ${s.items.map(i => `${i.name} ${i.sku}`).join(" ")}`.toLowerCase().includes(term));

  $("salesRows").innerHTML = filtered.map(s => `
    <tr>
      <td><strong>${esc(s.name)}</strong><br><small>ID ${esc(s.id)}</small></td>
      <td>${esc(s.createdAt || "—")}</td>
      <td>${esc(s.customer)}${s.company ? `<br><small>${esc(s.company)}</small>` : ""}${s.rut ? `<br><small>RUT ${esc(s.rut)}</small>` : ""}</td>
      <td>${esc(s.email || "—")}<br><small>${esc(s.phone || "Sin teléfono")}</small></td>
      <td>${esc(productSummary(s))}</td>
      <td>${esc(s.city || "—")}<br><small>${esc(s.region || "")}</small></td>
      <td><strong>${money(s.total)}</strong><br><small>${esc(s.paymentMethod)}</small></td>
      <td>${paymentBadge(s.financialStatus)}</td>
      <td>${fulfillmentBadge(s.fulfillmentStatus)}<br>${invoiceBadge(s.invoiceStatus)}</td>
    </tr>
  `).join("") || `<tr><td colspan="9" class="empty">Sin ventas para mostrar.</td></tr>`;
}

function renderProofs() {
  const rows = state.sales.filter(isManualPayment);
  $("proofRows").innerHTML = rows.map(s => {
    const status = state.proofStatus[s.id] || "pendiente";
    return `<tr>
      <td>${esc(s.name)}</td><td>${esc(s.customer)}<br><small>${esc(s.phone || s.email)}</small></td><td>${money(s.total)}</td><td>${esc(s.paymentMethod)}</td>
      <td>${badge(status, status === "aprobado" ? "green" : "yellow")}</td>
      <td><button class="miniBtn" data-approve-proof="${esc(s.id)}">Aprobar</button></td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" class="empty">No hay pagos manuales detectados.</td></tr>`;
}

function renderBilling() {
  const rows = state.sales.filter(s => isPaid(s));
  $("billingRows").innerHTML = rows.map(s => `
    <tr><td>${esc(s.name)}</td><td>${esc(s.customer)}${s.rut ? `<br><small>RUT ${esc(s.rut)}</small>` : ""}</td><td>${money(s.total)}</td><td>${paymentBadge(s.financialStatus)}</td><td>${invoiceBadge(s.invoiceStatus)}</td><td><button class="miniBtn" data-invoice="${esc(s.id)}">Marcar facturada</button></td></tr>
  `).join("") || `<tr><td colspan="6" class="empty">No hay ventas pagadas para facturar.</td></tr>`;
}

function renderSellers() {
  const sellers = ["Vendedor Terreno 1", "Vendedor Terreno 2", "Ejecutivo Shopify", "Backoffice Facturación"];
  $("sellerCards").innerHTML = sellers.map((name, index) => `
    <div class="seller"><strong>${esc(name)}</strong><span>${index < 2 ? "Captación y asesoría" : index === 2 ? "Ventas web" : "DTE y comprobantes"}</span></div>
  `).join("");
}

function countBy(list, getter) {
  return list.reduce((acc, item) => {
    const key = getter(item) || "Sin dato";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function renderReport(containerId, data) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  $(containerId).innerHTML = entries.map(([key, value]) => `<div class="reportBar"><span>${esc(key)}</span><span>${value}</span></div>`).join("") || `<p class="empty">Sin datos.</p>`;
}

function renderReports() {
  renderReport("paymentReport", countBy(state.sales, s => s.paymentMethod));
  renderReport("fulfillmentReport", countBy(state.sales, s => s.fulfillmentStatus));
  const products = {};
  for (const sale of state.sales) for (const item of sale.items) products[item.name] = (products[item.name] || 0) + item.quantity;
  renderReport("productReport", products);
}

function renderImportSummary(result, sales, meta = {}) {
  const paid = sales.filter(isPaid).length;
  const voided = sales.filter(isCancelled).length;
  const reviewDte = sales.filter(s => s.invoiceStatus === "revisar dte").length;
  const revenue = sales.filter(s => !isCancelled(s)).reduce((sum, s) => sum + s.total, 0);
  $("importSummary").innerHTML = [
    ["Archivo", meta.fileName || "CSV Shopify"],
    ["Filas Shopify", meta.rows || 0],
    ["Órdenes leídas", sales.length],
    ["Nuevas", result.added],
    ["Actualizadas", result.updated],
    ["Pagadas", paid],
    ["Anuladas", voided],
    ["DTE por revisar", reviewDte],
    ["Monto no anulado", money(revenue)]
  ].map(([k, v]) => `<div class="summaryItem"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("");
}

function renderImportError(message) {
  $("importSummary").innerHTML = `<div class="importError"><strong>No se pudo importar</strong><p>${esc(message)}</p></div>`;
}

function validateShopifyRows(rows) {
  if (!rows.length) throw new Error("El archivo no contiene filas de venta.");
  const headers = Object.keys(rows[0] || {});
  const hasOrder = headers.includes("Name") || headers.includes("Id") || headers.includes("Order ID") || headers.includes("Order Id");
  const hasLineItem = headers.includes("Lineitem name") || headers.includes("Lineitem Name") || headers.includes("Product") || headers.includes("Product title");
  if (!hasOrder || !hasLineItem) {
    throw new Error("El CSV no parece ser una exportación de órdenes Shopify. Debe incluir al menos Name/Id y Lineitem name.");
  }
}

async function handleCsvFile(file) {
  try {
    const text = await file.text();
    const rows = parseCsv(text);
    validateShopifyRows(rows);
    const sales = normalizeOrders(rows);
    if (!sales.length) throw new Error("No se encontraron órdenes válidas para importar.");
    const result = importSales(sales, { fileName: file.name, rows: rows.length });
    renderImportSummary(result, sales, { fileName: file.name, rows: rows.length });
    renderAll();
  } catch (error) {
    renderImportError(error.message || "Error inesperado leyendo el CSV.");
  }
}

function setupEvents() {
  document.querySelectorAll(".nav button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      button.classList.add("active");
      const id = button.dataset.section;
      $(id).classList.add("active");
      $("pageTitle").textContent = sections[id][0];
      $("pageSub").textContent = sections[id][1];
    });
  });

  $("csvFile").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) {
      const label = document.querySelector(".dropzone span");
      if (label) label.textContent = file.name;
      handleCsvFile(file);
    }
  });

  $("loadSampleBtn").addEventListener("click", () => {
    const rows = parseCsv(sampleCsv);
    const sales = normalizeOrders(rows);
    const result = importSales(sales, { fileName: "modelo-shopify-demo.csv", rows: rows.length });
    renderImportSummary(result, sales, { fileName: "modelo-shopify-demo.csv", rows: rows.length });
    renderAll();
  });

  $("salesSearch").addEventListener("input", renderSales);

  $("clearDataBtn").addEventListener("click", () => {
    state = { sales: [], proofStatus: {}, importHistory: [] };
    saveState();
    renderAll();
    $("importSummary").innerHTML = "<p>Datos demo eliminados.</p>";
  });

  $("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "klinge-sales-admin-export.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.addEventListener("click", event => {
    const proofId = event.target.dataset?.approveProof;
    const invoiceId = event.target.dataset?.invoice;

    if (proofId) {
      state.proofStatus[proofId] = "aprobado";
      saveState();
      renderAll();
    }

    if (invoiceId) {
      state.sales = state.sales.map(s => s.id === invoiceId ? { ...s, invoiceStatus: "facturada" } : s);
      saveState();
      renderAll();
    }
  });
}

setupEvents();
renderAll();
