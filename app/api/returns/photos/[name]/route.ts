import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadsDirectory } from "@/database/storage.mjs";
import { db } from "@/lib/db";
export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  if (
    !/^[a-f0-9-]{36}\.webp$/.test(name) ||
    !db
      .prepare("SELECT id FROM returns WHERE image_url=?")
      .get(`/api/returns/photos/${name}`)
  )
    return new Response("Not found", { status: 404 });
  try {
    return new Response(
      await readFile(path.join(uploadsDirectory(), name)),
      {
        headers: {
          "Content-Type": "image/webp",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
