import { createHash, timingSafeEqual } from "node:crypto";

export function validSellerCredential(request: Request) {
  const expected = process.env.RIP_VISION_ACCESS_TOKEN;
  if (!expected || expected === process.env.OPENAI_API_KEY?.trim())
    return false;
  const header = request.headers.get("authorization") ?? "";
  let supplied = "";
  if (header.startsWith("Bearer ")) supplied = header.slice(7);
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    if (decoded.startsWith("seller:")) supplied = decoded.slice(7);
  }
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(supplied), hash(expected));
}
