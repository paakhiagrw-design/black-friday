import { body, ops, respond } from "@/lib/operations/server";
import { positiveId } from "@/lib/operations/core";
import { connection } from "next/server";
export async function GET() {
  await connection();
  return respond(() => ({ deliveries: ops.deliveries() }));
}
export function POST(request: Request) {
  return respond(async () => {
    const data = await body(request);
    return { delivery: ops.arrange(positiveId(data.matchId), data.method) };
  });
}
