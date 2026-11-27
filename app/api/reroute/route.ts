import { db } from '@/lib/db';
import { approveReroute, cancelReroute, type RerouteResult } from '@/lib/logistics/repository';
import type { RerouteErrorCode, RerouteErrorResponse } from '@/lib/logistics/types';

const STATUS: Record<RerouteErrorCode, number> = {
  invalid_request: 400,
  not_found: 404,
  already_reserved: 409,
  already_dispatched: 409,
  return_ineligible: 422,
  candidate_ineligible: 422,
};

const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

function invalid(message: string) {
  const body: RerouteErrorResponse = { error: 'invalid_request', message };
  return Response.json(body, { status: 400 });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function respond(result: RerouteResult, successStatus: number) {
  if (result.ok) return Response.json({ match: result.match }, { status: successStatus });
  const body: RerouteErrorResponse = { error: result.code, message: result.message };
  if (result.rejections) body.rejections = result.rejections;
  return Response.json(body, { status: STATUS[result.code] });
}

/** Approve a reroute: { returnId, buyerOrderId } → 201 { match }. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body || !isId(body.returnId) || !isId(body.buyerOrderId)) {
    return invalid('Body must be { returnId: number, buyerOrderId: number }');
  }
  return respond(approveReroute(db, body.returnId, body.buyerOrderId), 201);
}

/** Cancel an accepted reroute before dispatch: { matchId } → 200 { match }. */
export async function DELETE(request: Request) {
  const body = await readJson(request);
  if (!body || !isId(body.matchId)) return invalid('Body must be { matchId: number }');
  return respond(cancelReroute(db, body.matchId), 200);
}
