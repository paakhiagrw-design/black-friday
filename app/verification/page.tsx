import type { Metadata } from "next";
import VerificationWorkspace from "@/components/verification/verification-workspace";
export const metadata: Metadata = {
  title: "Verification · RIP",
  description: "RIP — Return In Proximity. The end of unnecessary returns.",
};
export default function Page() {
  return <VerificationWorkspace />;
}
