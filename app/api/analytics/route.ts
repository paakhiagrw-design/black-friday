import { connection } from 'next/server';
import { DEFAULT_ANALYTICS_DAYS, getAnalytics } from '@/lib/dashboard/queries';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  await connection();
  const rawDays = new URL(request.url).searchParams.get('days') ?? String(DEFAULT_ANALYTICS_DAYS);
  const days = Number(rawDays);
  if (!/^\d+$/.test(rawDays) || !Number.isInteger(days) || days < 1 || days > 365) {
    return Response.json({ error: 'days must be an integer from 1 to 365' }, { status: 400 });
  }

  return Response.json(getAnalytics(db, days));
}
