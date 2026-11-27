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
  searchParams: Promise<{ delivery?: string }>;
}) {
  const params = await searchParams;
  const id = Number(params.delivery);
  return (
    <TrackingWorkspace
      initialDelivery={Number.isSafeInteger(id) && id > 0 ? id : null}
    />
  );
}
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ delivery?: string }>;
}) {
  return (
    <Suspense fallback={<TrackingWorkspace />}>
      <TrackingContent searchParams={searchParams} />
    </Suspense>
  );
}
