import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
const globalPrisma = globalThis as unknown as { ijcsitrPrisma?: PrismaClient };
function createClient() {
  const adapter = new PrismaMariaDb({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "ijcsitr_app",
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || "ijcsitr",
    connectionLimit: 8,
    collation: "utf8mb4_0900_ai_ci",
  });
  return new PrismaClient({ adapter });
}
export const prisma = globalPrisma.ijcsitrPrisma || createClient();
if (process.env.NODE_ENV !== "production") globalPrisma.ijcsitrPrisma = prisma;
