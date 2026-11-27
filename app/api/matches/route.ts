import { connection, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getMatchResults } from '@/lib/logistics/repository';
import type { MatchesResponse, RerouteErrorResponse } from '@/lib/logistics/types';

export async function GET(request: NextRequest) {
  await connection();
  const raw = request.nextUrl.searchParams.get('returnId');
  let returnId: number | undefined;
  if (raw !== null) {
    returnId = Number(raw);
    if (!Number.isInteger(returnId) || returnId <= 0) {
      const body: RerouteErrorResponse = { error: 'invalid_request', message: 'returnId must be a positive integer' };
      return Response.json(body, { status: 400 });
    }
  }
  const body: MatchesResponse = {
    results: getMatchResults(db, returnId),
    generatedAt: new Date().toISOString(),
  };
  return Response.json(body);
}
