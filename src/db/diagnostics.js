import { getPool } from "./pool.js";
import { ALLOWED_TABLES, safeIdentifier } from "./allowed-tables.js";

export async function getTableCounts() {
  const rows = [];
  const client = await getPool().connect();
  try {
    for (const table of [...ALLOWED_TABLES].sort()) {
      safeIdentifier(table);
      const result = await client.query(`select count(*)::int as row_count from ${table}`);
      rows.push({ table, row_count: result.rows[0]?.row_count || 0 });
    }
  } finally {
    client.release();
  }
  return rows;
}

export async function getCoreStatus() {
  const result = await getPool().query(`
    select table_name
    from information_schema.tables
    where table_schema='public'
      and table_type='BASE TABLE'
    order by table_name
  `);
  const existing = new Set(result.rows.map((row) => row.table_name));
  const required = [...ALLOWED_TABLES].sort();
  return {
    required_count: required.length,
    existing_count: required.filter((table) => existing.has(table)).length,
    missing: required.filter((table) => !existing.has(table)),
    existing: required.filter((table) => existing.has(table))
  };
}
