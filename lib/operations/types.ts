import type { ReturnRequest, DeliveryStatus, MatchStatus } from "../types";

export interface ReturnView extends ReturnRequest {
  product_name: string;
  sku: string;
  description: string;
  price: number;
  catalogue_image: string;
  customer_name: string;
  payment_status: string;
  active_match: number | null;
}
export interface Finding {
  label: string;
  detail: string;
  tone: "neutral" | "warning" | "success";
}
export interface Assessment {
  mode: "demo";
  title: string;
  findings: Finding[];
  recommendation: string;
}
export interface Inspection {
  id: number;
  delivery_id: number;
  outcome: "passed" | "failed";
  checks_json: string;
  sku_confirmed: string;
  notes: string;
  created_at: string;
}
export interface Receipt {
  reference: string;
  return_id: number;
  refund_amount: number;
  reward_amount: number;
  created_at: string;
}
export interface DeliveryEvent {
  event: string;
  created_at: string;
}
export interface DeliveryView {
  match_id: number;
  return_id: number;
  buyer_order_id: number;
  match_status: MatchStatus;
  distance_km: number;
  savings: number;
  traditional_cost: number;
  reroute_cost: number;
  delivery_id: number | null;
  tracking_code: string | null;
  delivery_status: DeliveryStatus | null;
  collected_at: string | null;
  delivered_at: string | null;
  created_at: string | null;
  method: "courier" | "locker" | null;
  arranged_at: string | null;
  product_name: string;
  sku: string;
  price: number;
  catalogue_image: string;
  returner_name: string;
  buyer_name: string;
  returner_lat: number;
  returner_lng: number;
  buyer_lat: number;
  buyer_lng: number;
  verification_status: string;
  return_status: string;
  refund_status: string;
  reward_amount: number;
  inspection: Inspection | null;
  receipt: Receipt | null;
  events: DeliveryEvent[];
}
export const mandatoryChecks = [
  [
    "identity",
    "Product identity",
    "The physical item matches the catalogue product.",
  ],
  [
    "sku",
    "SKU confirmation",
    "Read and confirm the SKU on the item or its label.",
  ],
  [
    "condition",
    "Condition & function",
    "Inspect all surfaces and perform appropriate functional checks.",
  ],
  [
    "packaging",
    "Packaging",
    "Packaging is safe and suitable for the next delivery.",
  ],
  [
    "accessories",
    "Accessories",
    "All required accessories and parts are present.",
  ],
] as const;
