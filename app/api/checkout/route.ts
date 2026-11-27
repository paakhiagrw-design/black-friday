import {
  failure,
  sameOrigin,
  selectedCustomer,
  store,
} from "@/lib/store/server";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    return Response.json(
      store.checkout(
        await selectedCustomer(),
        await request.json(),
        request.headers.get("idempotency-key"),
      ),
      { status: 201 },
    );
  } catch (error) {
    return failure(error);
  }
}
