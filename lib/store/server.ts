import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { positiveId, StoreError, storeService } from "./service";
export const store = storeService(db);
export async function selectedCustomer() {
  const value = (await cookies()).get("reroute-demo-customer")?.value;
  if (!value) throw new StoreError("Select a demo customer first.", 401);
  return store.customer(positiveId(value));
}
export function failure(error: unknown) {
  if (error instanceof StoreError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError)
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  console.error(error);
  return Response.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new StoreError("Request origin is not allowed.", 403);
}
