'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { REJECTION_LABELS, type RerouteErrorResponse } from '@/lib/logistics/types';

export function ApproveButton({ returnId, buyerOrderId }: { returnId: number; buyerOrderId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/reroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnId, buyerOrderId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as RerouteErrorResponse | null;
        const reasons = body?.rejections?.map((r) => REJECTION_LABELS[r]).join(', ');
        setError(
          res.status === 409
            ? 'Already reserved by another reroute. Refreshing…'
            : `${body?.message ?? 'Approval failed'}${reasons ? ` (${reasons})` : ''}`,
        );
      }
      startTransition(() => router.refresh());
    } catch {
      setError('Network error, please try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={approve}
        disabled={busy || pending}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy || pending ? 'Approving…' : 'Approve reroute'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
