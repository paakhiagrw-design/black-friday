import "@/components/store/store.css";
import "@/components/store/polish.css";
import { StoreProvider } from "@/components/store/store-context";
export const metadata = {
  title: "RIP — Return. In Proximity.",
  description:
    "Return. In Proximity. Give verified returns a shorter journey to a nearby buyer. Shop everyday essentials and manage your returns.",
};
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoreProvider>{children}</StoreProvider>;
}
