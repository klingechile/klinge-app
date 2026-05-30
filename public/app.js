const sampleCsv = `Name,Email,Financial Status,Paid at,Fulfillment Status,Fulfilled at,Currency,Subtotal,Shipping,Taxes,Total,Discount Amount,Created at,Lineitem quantity,Lineitem name,Lineitem price,Lineitem sku,Billing Name,Billing City,Billing Province Name,Billing Phone,Shipping Name,Shipping City,Shipping Province Name,Shipping Phone,Notes,Payment Method,Payment Reference,Refunded Amount,Id,Tags,Risk Level,Source
#1001,cliente1@mail.com,paid,2026-05-29 10:15:00,fulfilled,2026-05-30 11:00:00,CLP,96990,0,0,96990,0,2026-05-29 10:10:00,1,Panel LED 60x90,96990,LED-6090,Cliente Uno,Santiago,Región Metropolitana,+56911111111,Cliente Uno,Santiago,Región Metropolitana,+56911111111,,Mercado Pago,MP-001,0,1001,,Low,web
#1002,cliente2@mail.com,paid,2026-05-29 12:20:00,unfulfilled,,CLP,139990,5000,0,144990,0,2026-05-29 12:10:00,1,Panel LED 60x120,139990,LED-60120,Cliente Dos,La Florida,Región Metropolitana,+56922222222,Cliente Dos,La Florida,Región Metropolitana,+56922222222,,Bank Deposit,TR-002,0,1002,,Low,web
#1003,cliente3@mail.com,voided,,unfulfilled,,CLP,72540,0,0,72540,0,2026-05-28 09:00:00,1,Pantalla LED 50x70,72540,LED-5070,Cliente Tres,Ñuñoa,Región Metropolitana,+56933333333,Cliente Tres,Ñuñoa,Región Metropolitana,+56933333333,,Fintoc,FT-003,0,1003,,Low,web`;

let state = { sales: [], databaseConfigured: false };

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

function setBusy(message = "Cargando...") {
  const summary = $("importSummary");
  if (summary) summary.innerHTML = `<p>${esc(message)}</p>`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!response.ok) {
    throw new Error(data?.error || `Error HTTP ${response.status}`);
  }

  return data;
}

async function loadStatus() {
  try {
    const status = await api("/api/status");
    state.databaseConfigured = Boolean(status.databaseConfigured);
  } catch {
    state.databaseConfigured = false;
  }
}

async function loadSales() {
  try {
    const data = await api("/api/sales");
    state.sales = data.sales || [];
  } catch (error) {
    state.sales = [];
    renderError(`No se pudieron cargar ventas desde Railway PostgreSQL: ${error.message}`);
  }
}

function renderError(message) {
  const summary = $("importSummary");
  if (summary) summary.innerHTML = `<p class="empty">${esc(message)}</p>`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quote && next === '"') { cell += '"'; i++; continue; }
    if (char === '"') { quote = !quote; continue; }
    if (char === "," && !quote) { row.push(cell); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quote) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    if (row.some(Boolean)) rows.push(row);
  }

  const headers = rows.shift()?.map(h => h.trim()) || [];
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function numberFrom(value) {
  const clean = String(value || "0").replace(/[^0-9.-]/g, "");
  return Number(clean || 0);
}

function normalizeOrders(rows) {
  const map = new Map();

  for (const row of rows) {
    const orderId = row.Id || row.Name;
    if (!orderId) continue;

    if (!map.has(orderId)) {
      map.set(orderId, {
        id: String(orderId),
        name: row.Name || String(orderId),
        email: row.Email || "",
        customer: row["Billing Name"] || row["Shipping Name"] || row.Email || "Cliente sin nombre",
        phone: row["Billing Phone"] || row["Shipping Phone"] || "",
        city: row["Shipping City"] || row["Billing City"] || "",
        region: row["Shipping Province Name"] || row["Billing Province Name"] || "",
        financialStatus: row["Financial Status"] || "unknown",
        fulfillmentStatus: row["Fulfillment Status"] || "unfulfilled",
        paymentMethod: row["Payment Method"] || "Sin método",
        paymentReference: row["Payment Reference"] || "",
        total: numberFrom(row.Total),
        subtotal: numberFrom(row.Subtotal),
        shipping: numberFrom(row.Shipping),
        taxes: numberFrom(row.Taxes),
        createdAt: row["Created at"] || "",
        paidAt: row["Paid at"] || "",
        notes: row.Notes || "",
        riskLevel: row["Risk Level"] || "",
        source: row.Source || "shopify_csv",
        invoiceStatus: inferInvoiceStatus(row),
        items: []
      });
    }

    const sale = map.get(orderId);
    if (row["Lineitem name"]) {
      sale.items.push({
        name: row["Lineitem name"],
        sku: row["Lineitem sku"] || "",
        quantity: numberFrom(row["Lineitem quantity"] || 1),
        unitPrice: numberFrom(row["Lineitem price"])
      });
    }
  }

  return [...map.values()];
}

function inferInvoiceStatus(row) {
  const notes = `${row.Notes || ""}`.toLowerCase();
  if (notes.includes("lioren") || notes.includes("folio") || notes.includes("dte")) return "facturada";
  if ((row["Financial Status"] || "").toLowerCase() === "paid") return "pendiente";
  return "no lista";
}

function isManualPayment(sale) {
  const method = (sale.paymentMethod || "").toLowerCase();
  return method.includes("bank") || method.includes("deposit") || method.includes("transfer") || method.includes("transferencia");
}

async function importSalesToDatabase(newSales) {
  setBusy("Importando ventas en Railway PostgreSQL...");
  const result = await api("/api/shopify/import-csv", {
    method: "POST",
    body: JSON.stringify({ sales: newSales })
  });
  state.sales = result.sales || [];
  return result;
}

function badge(text, type = "blue") {
  return `<span class="badge ${type}">${esc(text || "—")}</span>`;
}

function paymentBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return badge("Pagada", "green");
  if (s === "voided") return badge("Anulada", "red");
  return badge(status || "Pendiente", "yellow");
}

function fulfillmentBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "fulfilled") return badge("Despachada", "green");
  if (s === "unfulfilled") return badge("Pendiente", "yellow");
  return badge(status || "—", "blue");
}

function invoiceBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "facturada") return badge("Facturada", "green");
  if (s === "pendiente") return badge("Pendiente", "yellow");
  return badge(status || "No lista", "blue");
}

function proofBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "aprobado") return badge("Aprobado", "green");
  if (s === "rechazado") return badge("Rechazado", "red");
  if (s === "no requerido") return badge("No requerido", "blue");
  return badge("Pendiente", "yellow");
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
  const revenue = sales.filter(s => s.financialStatus !== "voided").reduce((sum, s) => sum + Number(s.total || 0), 0);
  const proofs = sales.filter(s => isManualPayment(s) && s.paymentProofStatus !== "aprobado");
  const billing = sales.filter(s => s.financialStatus === "paid" && s.invoiceStatus !== "facturada");

  $("kpiOrders").textContent = sales.length;
  $("kpiRevenue").textContent = money(revenue);
  $("kpiProofs").textContent = proofs.length;
  $("kpiBilling").textContent = billing.length;

  $("latestRows").innerHTML = sales.slice(0, 8).map(s => `
    <tr><td>${esc(s.name)}</td><td>${esc(s.customer)}</td><td>${money(s.total)}</td><td>${paymentBadge(s.financialStatus)}</td><td>${fulfillmentBadge(s.fulfillmentStatus)}</td></tr>
  `).join("") || `<tr><td colspan="5" class="empty">Importa ventas Shopify para iniciar.</td></tr>`;

  const tasks = [];
  if (!state.databaseConfigured) tasks.push("Configurar DATABASE_URL en Railway y asociar el servicio PostgreSQL a la app.");
  if (proofs.length) tasks.push(`${proofs.length} comprobante(s) por aprobar.`);
  if (billing.length) tasks.push(`${billing.length} venta(s) lista(s) para facturación.`);
  const pendingDispatch = sales.filter(s => s.financialStatus === "paid" && s.fulfillmentStatus !== "fulfilled").length;
  if (pendingDispatch) tasks.push(`${pendingDispatch} venta(s) pagada(s) pendiente(s) de despacho.`);
  if (!tasks.length) tasks.push("Sin prioridades críticas. Importa ventas para revisar operación.");

  $("priorityList").innerHTML = tasks.map(t => `<li>${esc(t)}</li>`).join("");
}

function renderSales() {
  const term = ($("salesSearch")?.value || "").toLowerCase();
  const filtered = state.sales.filter(s => `${s.name} ${s.customer} ${s.email} ${s.items.map(i => i.name).join(" ")}`.toLowerCase().includes(term));

  $("salesRows").innerHTML = filtered.map(s => `
    <tr>
      <td><strong>${esc(s.name)}</strong><br><small>${esc(s.id)}</small></td>
      <td>${esc(s.createdAt || "—")}</td>
      <td>${esc(s.customer)}<br><small>${esc(s.email)}</small></td>
      <td>${esc(s.items.map(i => `${i.quantity}x ${i.name}`).join(", ") || "—")}</td>
      <td>${money(s.total)}</td>
      <td>${paymentBadge(s.financialStatus)}</td>
      <td>${fulfillmentBadge(s.fulfillmentStatus)}</td>
      <td>${invoiceBadge(s.invoiceStatus)}</td>
    </tr>
  `).join("") || `<tr><td colspan="8" class="empty">Sin ventas para mostrar.</td></tr>`;
}

function renderProofs() {
  const rows = state.sales.filter(isManualPayment);
  $("proofRows").innerHTML = rows.map(s => `
    <tr>
      <td>${esc(s.name)}</td><td>${esc(s.customer)}</td><td>${money(s.total)}</td><td>${esc(s.paymentMethod)}</td>
      <td>${proofBadge(s.paymentProofStatus)}</td>
      <td><button class="miniBtn" data-approve-proof="${esc(s.id)}">Aprobar</button></td>
    </tr>
  `).join("") || `<tr><td colspan="6" class="empty">No hay pagos manuales detectados.</td></tr>`;
}

function renderBilling() {
  const rows = state.sales.filter(s => s.financialStatus === "paid");
  $("billingRows").innerHTML = rows.map(s => `
    <tr><td>${esc(s.name)}</td><td>${esc(s.customer)}</td><td>${money(s.total)}</td><td>${paymentBadge(s.financialStatus)}</td><td>${invoiceBadge(s.invoiceStatus)}</td><td><button class="miniBtn" data-invoice="${esc(s.id)}">Marcar facturada</button></td></tr>
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

function renderImportSummary(result, sales) {
  const paid = sales.filter(s => s.financialStatus === "paid").length;
  const voided = sales.filter(s => s.financialStatus === "voided").length;
  const revenue = sales.filter(s => s.financialStatus !== "voided").reduce((sum, s) => sum + s.total, 0);
  $("importSummary").innerHTML = [
    ["Órdenes leídas", sales.length],
    ["Nuevas", result.added],
    ["Actualizadas", result.updated],
    ["Pagadas", paid],
    ["Anuladas", voided],
    ["Monto no anulado", money(revenue)],
    ["Persistencia", "Railway PostgreSQL"]
  ].map(([k, v]) => `<div class="summaryItem"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("");
}

async function handleCsvText(text) {
  try {
    const rows = parseCsv(text);
    const sales = normalizeOrders(rows);
    const result = await importSalesToDatabase(sales);
    renderImportSummary(result, sales);
    renderAll();
  } catch (error) {
    renderError(error.message);
  }
}

async function handleCsvFile(file) {
  await handleCsvText(await file.text());
}

async function refresh() {
  await loadStatus();
  if (state.databaseConfigured) await loadSales();
  renderAll();
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
    if (file) handleCsvFile(file);
  });

  $("loadSampleBtn").addEventListener("click", () => handleCsvText(sampleCsv));
  $("salesSearch").addEventListener("input", renderSales);

  $("clearDataBtn").addEventListener("click", async () => {
    await refresh();
    $("importSummary").innerHTML = "<p>Datos recargados desde Railway PostgreSQL. La eliminación masiva se hará en una acción segura futura.</p>";
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

  document.addEventListener("click", async event => {
    const proofId = event.target.dataset?.approveProof;
    const invoiceId = event.target.dataset?.invoice;

    try {
      if (proofId) {
        const result = await api(`/api/payment-proofs/${encodeURIComponent(proofId)}/approve`, { method: "PATCH" });
        state.sales = result.sales || state.sales;
        renderAll();
      }

      if (invoiceId) {
        const result = await api(`/api/invoices/${encodeURIComponent(invoiceId)}/mark-issued`, { method: "PATCH" });
        state.sales = result.sales || state.sales;
        renderAll();
      }
    } catch (error) {
      renderError(error.message);
    }
  });
}

setupEvents();
refresh();
