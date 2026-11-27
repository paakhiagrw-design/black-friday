import { connection } from 'next/server';
import { getDashboardStats } from '@/lib/dashboard/queries';
import { db } from '@/lib/db';

export async function GET() {
  await connection();
  return Response.json(getDashboardStats(db));
}
