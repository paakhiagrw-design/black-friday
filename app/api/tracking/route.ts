import { body, ops, respond } from "@/lib/operations/server";
import { positiveId, WorkflowError } from "@/lib/operations/core";
import { connection } from "next/server";
export async function GET() {
  await connection();
  return respond(() => ({
    deliveries: ops.deliveries().filter((d) => d.delivery_id !== null),
  }));
}
export function POST(request: Request) {
  return respond(async () => {
    const data = await body(request);
    const id = positiveId(data.deliveryId);
    if (data.action === "refund") return { delivery: ops.refund(id) };
    if (data.action === "advance")
      return { delivery: ops.advance(id, data.status) };
    throw new WorkflowError("Unknown tracking action.", 400);
  });
}
