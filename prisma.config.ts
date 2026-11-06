import "dotenv/config";
import { defineConfig } from "prisma/config";
const url =
  process.env.DATABASE_URL ||
  `mysql://${encodeURIComponent(process.env.MYSQL_USER || "ijcsitr_app")}:${encodeURIComponent(process.env.MYSQL_PASSWORD || "")}@${process.env.MYSQL_HOST || "127.0.0.1"}:${process.env.MYSQL_PORT || "3306"}/${process.env.MYSQL_DATABASE || "ijcsitr"}`;
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
});
