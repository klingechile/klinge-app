import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2] || "netlify/index.html";
const outputPath = process.argv[3] || "public/index.html";

if (!fs.existsSync(inputPath)) {
  console.error(`Input HTML not found: ${inputPath}`);
  console.error("Usage: node scripts/migrate/patch-netlify-html-to-railway.mjs netlify/index.html public/index.html");
  process.exit(1);
}

let html = fs.readFileSync(inputPath, "utf8");

const startMarker = "// ══════════════════════════\n// SUPABASE\n// ══════════════════════════";
const start = html.indexOf(startMarker);
const dbMarker = "var DB={";
const dbIndex = html.indexOf(dbMarker, start);

if (start === -1 || dbIndex === -1) {
  console.error("Could not find Supabase helper block in HTML.");
  process.exit(1);
}

const replacement = `${startMarker}
// Migrado a Railway PostgreSQL via backend interno.
// Mantiene los nombres sbGet/sbInsert/sbUpdate/sbDelete/sbUpsert para no tocar el resto del frontend.
var TABLE_ORDER={user_pins:'updated_at',user_permissions:'updated_at',vendedores:'created_at',ventas:'created_at',clientes:'created_at',gastos:'created_at',productos:'created_at',cobros:'created_at',app_config:'updated_at',recordatorios:'created_at',leads:'created_at',inventario:'created_at',contenido:'created_at',comisiones:'created_at',terreno:'created_at',lumi_conversaciones:'created_at',klinge_leads:'created_at',social_conversaciones:'ultimo_mensaje_at',social_mensajes:'created_at',lumi_config:'updated_at',lumi_productos:'orden'};

function apiUrl(t,p,limit){
  var o=TABLE_ORDER[t]||'created_at';
  var lim=limit||500;
  return '/api/data/'+encodeURIComponent(t)+'?order='+encodeURIComponent(o+'.desc')+'&limit='+encodeURIComponent(lim)+(p?'&'+p:'');
}
async function apiJson(r){
  if(!r.ok)throw new Error(await r.text());
  if(r.status===204)return null;
  return r.json();
}
async function sbGet(t,p,limit){
  var r=await fetch(apiUrl(t,p,limit),{headers:{'Accept':'application/json'}});
  var data=await apiJson(r);
  return data||[];
}
async function sbInsert(t,d){
  var r=await fetch('/api/data/'+encodeURIComponent(t),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
  return apiJson(r);
}
async function sbUpdate(t,id,d){
  var r=await fetch('/api/data/'+encodeURIComponent(t)+'/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
  return apiJson(r);
}
async function sbDelete(t,id){
  var r=await fetch('/api/data/'+encodeURIComponent(t)+'/'+encodeURIComponent(id),{method:'DELETE'});
  return apiJson(r);
}
async function sbUpsert(t,d){
  var r=await fetch('/api/data/'+encodeURIComponent(t),{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify(d)});
  return apiJson(r);
}
async function sbBatch(t,rows){
  var r=await fetch('/api/data/'+encodeURIComponent(t),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(rows)});
  return apiJson(r);
}

`;

html = html.slice(0, start) + replacement + html.slice(dbIndex);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);

console.log(`Patched HTML written to ${outputPath}`);
