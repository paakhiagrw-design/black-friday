import type { Metadata } from "next";
import InspectionWorkspace from "@/components/delivery/inspection-workspace";
export const metadata: Metadata = {
  title: "Inspection · RIP",
  description: "RIP — Return In Proximity. The end of unnecessary returns.",
};
export default function Page() {
  return <InspectionWorkspace />;
}
