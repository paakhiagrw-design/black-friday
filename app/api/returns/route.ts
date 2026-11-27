import { connection } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  failure,
  sameOrigin,
  selectedCustomer,
  store,
} from "@/lib/store/server";
import { positiveId, StoreError } from "@/lib/store/service";
export async function GET() {
  await connection();
  try {
    return Response.json(
      { returns: store.returns(await selectedCustomer()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  let saved: string | undefined;
  try {
    sameOrigin(request);
    const customer = await selectedCustomer();
    if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024)
      throw new StoreError("Photo must be under 5 MB.", 413);
    const form = await request.formData();
    const orderId = positiveId(form.get("order_id"));
    store.eligible(customer, orderId);
    const photo = form.get("photo");
    if (
      !(photo instanceof File) ||
      !photo.size ||
      photo.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
    )
      throw new StoreError("Upload a JPG, PNG or WebP photo under 5 MB.");
    let image: Buffer;
    try {
      image = await sharp(Buffer.from(await photo.arrayBuffer()), {
        limitInputPixels: 25000000,
      })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new StoreError(
        "This image could not be read. Try a JPG, PNG or WebP photo.",
      );
    }
    const name = `${randomUUID()}.webp`;
    const dir = path.join(process.cwd(), "database/store-uploads");
    await mkdir(dir, { recursive: true });
    saved = path.join(dir, name);
    await writeFile(saved, image, { flag: "wx" });
    const result = store.submitReturn(
      customer,
      orderId,
      String(form.get("reason") || ""),
      String(form.get("condition") || ""),
      `/api/returns/photos/${name}`,
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (saved) await unlink(saved).catch(() => {});
    return failure(error);
  }
}
