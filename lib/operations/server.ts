import "server-only";
import { db } from "@/lib/db";
import { acceptsOrigin } from "./request-origin";
import { operations, WorkflowError } from "./core";

export const ops = operations(db);
export async function body(request: Request): Promise<Record<string, unknown>> {
  if (!acceptsOrigin(request))
    throw new WorkflowError("Cross-origin writes are not allowed.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new WorkflowError("Send a JSON request.", 415);
  const text = await request.text();
  if (text.length > 16000)
    throw new WorkflowError("Request is too large.", 413);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new WorkflowError("Invalid JSON.", 400);
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new WorkflowError("A JSON object is required.", 400);
  return data as Record<string, unknown>;
}
export async function respond(work: () => unknown | Promise<unknown>) {
  try {
    return Response.json(await work(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof WorkflowError)
      return Response.json({ error: error.message }, { status: error.status });
    console.error("Operations request failed", error);
    return Response.json(
      { error: "The operation could not be completed. Please retry." },
      { status: 500 },
    );
  }
}
