import { prisma } from "../src/lib/prisma";
import type { Prisma } from "../src/generated/prisma/client";
type Client = Prisma.TransactionClient;
type Row = Record<string, any>;
export function serializeDatabase(value: any): any {
  if (typeof value === "bigint") {
    const number = Number(value);
    if (!Number.isSafeInteger(number))
      throw new RangeError("Database integer exceeds safe JSON range.");
    return number;
  }
  if (value instanceof Date)
    return value.toISOString().replace("T", " ").replace("Z", "");
  if (Array.isArray(value)) return value.map(serializeDatabase);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        serializeDatabase(item),
      ]),
    );
  return value;
}
function normalizeError(error: any): never {
  const driverCode =
    error?.meta?.code ?? error?.meta?.driverAdapterError?.cause?.originalCode;
  if (error?.code === "P2010" && ["1451", "1452"].includes(String(driverCode)))
    error.code = "ER_ROW_IS_REFERENCED_2";
  if (error?.code === "P2003") error.code = "ER_ROW_IS_REFERENCED_2";
  throw error;
}
async function execute(
  client: Client,
  sql: string,
  params: unknown[] = [],
): Promise<any> {
  try {
    // Every user value remains a bound parameter. SQL identifiers/order clauses are server-owned.
    if (/^\s*(SELECT|SHOW|DESCRIBE|WITH)\b/i.test(sql))
      return serializeDatabase(
        await client.$queryRawUnsafe<Row[]>(sql, ...params),
      );
    const affectedRows = await client.$executeRawUnsafe(sql, ...params);
    if (/^\s*INSERT\b/i.test(sql)) {
      const rows = await client.$queryRawUnsafe<Row[]>(
        "SELECT LAST_INSERT_ID() AS id",
      );
      return { affectedRows, insertId: serializeDatabase(rows[0].id) };
    }
    return { affectedRows };
  } catch (error) {
    normalizeError(error);
  }
}
export async function query(sql: string, params: unknown[] = []): Promise<any> {
  // LAST_INSERT_ID is connection scoped, so inserts and ID retrieval share one transaction.
  if (/^\s*INSERT\b/i.test(sql))
    return prisma.$transaction((client) => execute(client, sql, params));
  return execute(prisma, sql, params);
}
export type DatabaseTransaction = {
  execute: (sql: string, params?: unknown[]) => Promise<[any]>;
  afterCommit: (effect: () => void) => void;
};
export async function transaction<T>(
  work: (connection: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  const effects: (() => void)[] = [];
  const result = await prisma.$transaction(
    (client) =>
      work({
        execute: async (sql, params = []) => [
          await execute(client, sql, params),
        ],
        afterCommit: (effect) => {
          effects.push(effect);
        },
      }),
    { maxWait: 10000, timeout: 15000 },
  );
  for (const effect of effects) effect();
  return result;
}
export const db = { end: () => prisma.$disconnect() };
