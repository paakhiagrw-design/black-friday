import { connection } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { uploadsDirectory } from "@/database/storage.mjs";
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
    if (
      !request.headers.get("content-type")?.startsWith("multipart/form-data") ||
      !request.body
    )
      throw new StoreError("Submit a photo using the return form.", 415);
    const reader = request.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 6 * 1024 * 1024) {
        await reader.cancel();
        throw new StoreError("Photo must be under 5 MB.", 413);
      }
      chunks.push(new Uint8Array(value));
    }
    let form;
    try {
      form = await new Response(new Blob(chunks), {
        headers: { "Content-Type": request.headers.get("content-type")! },
      }).formData();
    } catch {
      throw new StoreError("The return form could not be read.", 400);
    }
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
      const source = sharp(Buffer.from(await photo.arrayBuffer()), {
        limitInputPixels: 25000000,
      });
      if (
        !["jpeg", "png", "webp"].includes(
          (await source.metadata()).format ?? "",
        )
      )
        throw new Error();
      image = await source
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
    const dir = uploadsDirectory();
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
