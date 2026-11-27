import type { Metadata } from "next";
import TrackingWorkspace from "@/components/delivery/tracking-workspace";
import { Suspense } from "react";
export const metadata: Metadata = {
  title: "Tracking · RIP",
  description: "RIP — Return In Proximity. The end of unnecessary returns.",
};
async function TrackingContent({
  searchParams,
}: {
  searchParams: Promise<{ delivery?: string; reference?: string }>;
}) {
  const params = await searchParams;
  const id = params.delivery === undefined ? null : Number(params.delivery);
  return (
    <TrackingWorkspace
      key={JSON.stringify([params.delivery, params.reference])}
      initialDelivery={id === null ? null : Number.isSafeInteger(id) && id > 0 ? id : -1}
      reference={params.reference}
    />
  );
}
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ delivery?: string; reference?: string }>;
}) {
  return (
    <Suspense fallback={<TrackingWorkspace />}>
      <TrackingContent searchParams={searchParams} />
    </Suspense>
  );
}
