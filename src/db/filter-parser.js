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
    if (["order", "limit", "offset"].includes(key)) continue;
    if (!rawValue || !rawValue.includes(".")) continue;

    const [operator, ...rest] = rawValue.split(".");
    const value = rest.join(".");
    const sqlOperator = OPERATORS[operator];
    if (!sqlOperator) continue;

    clauses.push(`${safeIdentifier(key)} ${sqlOperator} $${index}`);
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
