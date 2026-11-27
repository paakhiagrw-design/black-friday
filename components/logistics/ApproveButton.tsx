'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { REJECTION_LABELS, type RerouteErrorResponse } from '@/lib/logistics/types';

export function ApproveButton({ returnId, buyerOrderId }: { returnId: number; buyerOrderId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; conflict?: boolean } | null>(null);

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
        setError({
          message: res.status === 409
            ? 'This return or buyer order is already reserved.'
            : `${body?.message ?? 'Approval failed'}${reasons ? ` (${reasons})` : ''}`,
          conflict: res.status === 409,
        });
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError({ message: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={approve}
        disabled={busy || pending || error?.conflict}
        className="inline-flex min-h-12 items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--on-accent)] transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-px disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:brightness-100"
      >
        {busy || (pending && !error?.conflict) ? 'Approving…' : 'Approve reroute'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-right text-xs text-[var(--danger)]">
          {error.message}
        </p>
      )}
      {error?.conflict && (
        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className="text-sm font-medium text-[var(--ink)] underline underline-offset-4 hover:text-[var(--olive)] disabled:opacity-50"
        >
          {pending ? 'Refreshing…' : 'Refresh matches'}
        </button>
      )}
    </div>
  );
}
