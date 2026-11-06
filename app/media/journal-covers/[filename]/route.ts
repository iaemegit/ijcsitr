import { readFile } from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  if (!/^[a-f0-9-]+\.webp$/.test(filename))
    return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(
      path.join(process.cwd(), "uploads/journal-covers", filename),
    );
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
