import type { Metadata } from "next";
import DeliveryWorkspace from "@/components/delivery/delivery-workspace";
export const metadata: Metadata = {
  title: "Delivery · RIP",
  description: "RIP — Return In Proximity. The end of unnecessary returns.",
};
export default function Page() {
  return <DeliveryWorkspace />;
}
