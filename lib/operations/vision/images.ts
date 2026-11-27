import "server-only";
import { createHash } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { WorkflowError } from "../core";

const maxBytes = 5 * 1024 * 1024;
const upload = /^\/api\/returns\/photos\/([a-f0-9-]{36}\.webp)$/;

export interface Evidence {
  url: string;
  digest: string;
}

function invalid(label: string, message: string): never {
  throw new WorkflowError(`${label}: ${message}`, 422);
}

export function requireSource(src: string, label: string) {
  if (!src || /^https?:\/\/(?:[^/]+\.)?example\.test(?:\/|$)/i.test(src))
    invalid(label, "a real image is required before scanning.");
}

async function readLocal(root: string, name: string, label: string) {
  let file;
  try {
    const base = await realpath(root);
    const target = await realpath(path.join(base, name));
    if (!target.startsWith(base + path.sep))
      invalid(label, "invalid image path.");
    file = await open(target, "r");
    const stat = await file.stat();
    if (!stat.isFile() || !stat.size || stat.size > maxBytes)
      invalid(label, "provide a non-empty image up to 5 MB.");
    return await file.readFile();
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    invalid(label, "the image file is unavailable.");
  } finally {
    await file?.close();
  }
}

async function readRemote(src: string, label: string) {
  let url;
  try {
    url = new URL(src);
  } catch {
    invalid(label, "invalid image URL.");
  }
  const hosts = (process.env.RIP_VISION_IMAGE_HOSTS ?? "images.unsplash.com")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !hosts.includes(url.hostname)
  )
    invalid(
      label,
      "use a local image or configure its trusted HTTPS host in RIP_VISION_IMAGE_HOSTS.",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok || !response.body)
      invalid(label, "the image host could not supply this file.");
    if (Number(response.headers.get("content-length")) > maxBytes)
      invalid(label, "image exceeds 5 MB.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) invalid(label, "image exceeds 5 MB.");
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    invalid(label, "image download failed or timed out.");
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function evidence(src: string, label: string): Promise<Evidence> {
  requireSource(src, label);
  let bytes: Buffer;
  const stored = upload.exec(src);
  if (stored) {
    bytes = await readLocal(
      path.join(process.cwd(), "database/store-uploads"),
      stored[1],
      label,
    );
  } else if (src.startsWith("/")) {
    if (!/^\/(?:[\w-]+\/)*[\w.-]+\.(?:jpe?g|png|webp)$/i.test(src))
      invalid(label, "unsupported local image path.");
    bytes = await readLocal(
      path.join(process.cwd(), "public"),
      src.slice(1),
      label,
    );
  } else {
    bytes = await readRemote(src, label);
  }
  let mime: string;
  if (bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")))
    mime = "image/png";
  else if (bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")))
    mime = "image/jpeg";
  else if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    mime = "image/webp";
  else invalid(label, "a JPEG, PNG or WebP photograph is required.");
  return {
    url: `data:${mime};base64,${bytes.toString("base64")}`,
    digest: createHash("sha256").update(bytes).digest("hex"),
  };
}
