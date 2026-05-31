import { safeIdentifier } from "./allowed-tables.js";

const OPERATORS = {
  eq: "=",
  neq: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  like: "like",
  ilike: "ilike"
};

export function parseFilters(searchParams, startIndex = 1) {
  const clauses = [];
  const values = [];
  let index = startIndex;

  for (const [key, rawValue] of searchParams.entries()) {
    if (["order", "limit", "offset", "select"].includes(key)) continue;
    if (!rawValue || !rawValue.includes(".")) continue;

    const [operator, ...rest] = rawValue.split(".");
    const value = rest.join(".");
    const column = safeIdentifier(key);

    if (operator === "in") {
      const normalized = value.replace(/^\(/, "").replace(/\)$/, "");
      const list = normalized.split(",").map((item) => item.trim()).filter(Boolean);
      clauses.push(`${column} = any($${index})`);
      values.push(list);
      index += 1;
      continue;
    }

    const sqlOperator = OPERATORS[operator];
    if (!sqlOperator) continue;

    clauses.push(`${column} ${sqlOperator} $${index}`);
    values.push(value);
    index += 1;
  }

  return { clauses, values, nextIndex: index };
}

export function parseOrder(searchParams, fallbackColumn) {
  const rawOrder = searchParams.get("order");
  const source = rawOrder || `${fallbackColumn}.desc`;
  const [column, directionRaw] = source.split(".");
  const direction = String(directionRaw || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  return { column: safeIdentifier(column || fallbackColumn), direction };
}

export function parseLimit(searchParams) {
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 500), 1), 1000);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
  return { limit, offset };
}
