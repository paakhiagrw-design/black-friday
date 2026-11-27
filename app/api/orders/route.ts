import { connection } from "next/server";
import { failure, selectedCustomer, store } from "@/lib/store/server";
export async function GET() {
  await connection();
  try {
    return Response.json(
      { orders: store.orders(await selectedCustomer()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
