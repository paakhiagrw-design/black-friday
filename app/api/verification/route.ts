import { body, ops, respond } from "@/lib/operations/server";
import { positiveId } from "@/lib/operations/core";
import { authorizeScan, scanReturn } from "@/lib/operations/vision/server";
import { connection } from "next/server";
export async function GET() {
  await connection();
  return respond(() => ({ returns: ops.returns() }));
}
export function POST(request: Request) {
  return respond(async () => {
    const data = await body(request);
    const id = positiveId(data.returnId);
    if (data.action === "scan") {
      authorizeScan(request);
      return { assessment: await scanReturn(ops.returnById(id)) };
    }
    return { return: ops.decide(id, data.action, data.notes) };
  });
}
