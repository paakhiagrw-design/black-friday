import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { failure, sameOrigin, store } from "@/lib/store/server";
import { positiveId } from "@/lib/store/service";
export async function GET() {
  await connection();
  return Response.json(
    {
      products: db.prepare("SELECT * FROM products ORDER BY id").all(),
      customers: db.prepare("SELECT * FROM customers ORDER BY id").all(),
      customer_id:
        Number((await cookies()).get("reroute-demo-customer")?.value) || null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await request.json();
    const id = store.customer(positiveId(body.customer_id));
    (await cookies()).set("reroute-demo-customer", String(id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400 * 7,
    });
    return Response.json({ customer_id: id });
  } catch (error) {
    return failure(error);
  }
}
