import { Suspense } from "react";
import { Returns } from "@/components/store/views";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading your return…</p>}>
      <Returns />
    </Suspense>
  );
}

export const metadata = { title: "Returns & requests | RIP" };
