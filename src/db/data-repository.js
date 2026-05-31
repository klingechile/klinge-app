import { getPool } from "./pool.js";
import { assertAllowedTable, DEFAULT_ORDER, getPrimaryKey, safeIdentifier } from "./allowed-tables.js";
import { parseFilters, parseLimit, parseOrder } from "./filter-parser.js";

export async function listRows(table, searchParams) {
  assertAllowedTable(table);
  safeIdentifier(table);

  const fallbackOrder = DEFAULT_ORDER[table] || "created_at";
  const { clauses, values } = parseFilters(searchParams, 1);
  const { column, direction } = parseOrder(searchParams, fallbackOrder);
  const { limit, offset } = parseLimit(searchParams);

  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const query = `select * from ${table} ${where} order by ${column} ${direction} limit $${values.length + 1} offset $${values.length + 2}`;
  const result = await getPool().query(query, [...values, limit, offset]);
  return result.rows;
}

export async function insertRow(table, payload) {
  assertAllowedTable(table);
  safeIdentifier(table);

  const rows = Array.isArray(payload) ? payload : [payload];
  if (!rows.length) return [];

  const inserted = [];
  const client = await getPool().connect();
  try {
    await client.query("begin");
    for (const row of rows) {
      const result = await insertWithClient(client, table, row);
      inserted.push(...result);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return inserted;
}

export async function updateRow(table, id, payload) {
  assertAllowedTable(table);
  safeIdentifier(table);

  const primaryKey = safeIdentifier(getPrimaryKey(table));
  const columns = Object.keys(payload || {}).filter((key) => key !== primaryKey).map(safeIdentifier);
  if (!columns.length) return [];

  const values = columns.map((column) => payload[column]);
  const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(", ");
  const query = `update ${table} set ${assignments} where ${primaryKey} = $${columns.length + 1} returning *`;
  const result = await getPool().query(query, [...values, id]);
  return result.rows;
}

export async function updateMany(table, searchParams, payload) {
  assertAllowedTable(table);
  safeIdentifier(table);

  const columns = Object.keys(payload || {}).map(safeIdentifier);
  if (!columns.length) return [];

  const values = columns.map((column) => payload[column]);
  const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(", ");
  const { clauses, values: filterValues } = parseFilters(searchParams, values.length + 1);
  if (!clauses.length) {
    const error = new Error("Refusing filtered update without filters");
    error.status = 400;
    throw error;
  }

  const query = `update ${table} set ${assignments} where ${clauses.join(" and ")} returning *`;
  const result = await getPool().query(query, [...values, ...filterValues]);
  return result.rows;
}

export async function deleteRow(table, id) {
  assertAllowedTable(table);
  safeIdentifier(table);

  const primaryKey = safeIdentifier(getPrimaryKey(table));
  await getPool().query(`delete from ${table} where ${primaryKey} = $1`, [id]);
  return { ok: true };
}

export async function deleteMany(table, searchParams) {
  assertAllowedTable(table);
  safeIdentifier(table);

  const { clauses, values } = parseFilters(searchParams, 1);
  if (!clauses.length) {
    const error = new Error("Refusing filtered delete without filters");
    error.status = 400;
    throw error;
  }

  const result = await getPool().query(`delete from ${table} where ${clauses.join(" and ")} returning *`, values);
  return result.rows;
}

export async function upsertRow(table, payload) {
  assertAllowedTable(table);
  safeIdentifier(table);

  const rows = Array.isArray(payload) ? payload : [payload];
  if (!rows.length) return [];

  const primaryKey = safeIdentifier(getPrimaryKey(table));
  const resultRows = [];
  const client = await getPool().connect();
  try {
    await client.query("begin");
    for (const row of rows) {
      const keyValue = row?.[primaryKey];
      if (!keyValue) {
        const result = await insertWithClient(client, table, row);
        resultRows.push(...result);
        continue;
      }

      const columns = Object.keys(row).filter((key) => key !== primaryKey).map(safeIdentifier);
      if (!columns.length) {
        const existing = await client.query(`select * from ${table} where ${primaryKey} = $1`, [keyValue]);
        resultRows.push(...existing.rows);
        continue;
      }
      const values = columns.map((column) => row[column]);
      const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(", ");
      const update = await client.query(`update ${table} set ${assignments} where ${primaryKey} = $${columns.length + 1} returning *`, [...values, keyValue]);
      if (update.rowCount) {
        resultRows.push(...update.rows);
      } else {
        const result = await insertWithClient(client, table, row);
        resultRows.push(...result);
      }
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return resultRows;
}

async function insertWithClient(client, table, row) {
  const columns = Object.keys(row || {}).filter(Boolean).map(safeIdentifier);
  const values = columns.map((column) => row[column]);
  if (!columns.length) return [];
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const result = await client.query(`insert into ${table} (${columns.join(", ")}) values (${placeholders}) returning *`, values);
  return result.rows;
}
