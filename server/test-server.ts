import "dotenv/config";
import http from "node:http";
import next from "next";
import { db } from "./db";
const port = Number(process.env.PORT || 4000),
  host = process.env.HOST || "127.0.0.1";
const frontend = next({ dev: false, hostname: host, port });
await frontend.prepare();
const handler = frontend.getRequestHandler();
const server = http.createServer((req, res) => handler(req, res));
server.listen(port, host, () =>
  console.log(`IJCSITR API: http://${host}:${port}`),
);
async function shutdown() {
  server.close();
  await db.end();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
