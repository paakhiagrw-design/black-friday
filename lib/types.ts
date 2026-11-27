export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type FulfillmentStatus = 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type ReturnCondition = 'unopened' | 'like_new' | 'good' | 'fair' | 'damaged';
export type VerificationStatus = 'pending' | 'verified' | 'failed';
export type ReturnStatus = 'requested' | 'approved' | 'matched' | 'in_transit' | 'completed' | 'rejected' | 'cancelled';
export type RefundStatus = 'pending' | 'approved' | 'refunded' | 'denied';
export type MatchStatus = 'proposed' | 'accepted' | 'in_transit' | 'completed' | 'cancelled' | 'failed';
export type DeliveryStatus = 'pending' | 'collected' | 'in_transit' | 'delivered' | 'failed';

export interface Customer {
  id: number;
  name: string;
  email: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  /** Price in integer cents. */
  price: number;
  image_url: string;
}

export interface Order {
  id: number;
  customer_id: number;
  product_id: number;
  quantity: 1;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  reroute_consent: boolean;
  created_at: string;
}

export interface ReturnRequest {
  id: number;
  order_id: number;
  reason: string;
  condition: ReturnCondition;
  image_url: string;
  verification_status: VerificationStatus;
  verification_notes: string;
  return_status: ReturnStatus;
  refund_status: RefundStatus;
  /** Reward in integer cents. */
  reward_amount: number;
  created_at: string;
}

export interface Match {
  id: number;
  return_id: number;
  buyer_order_id: number;
  distance_km: number;
  /** All cost and savings amounts are integer cents. */
  traditional_cost: number;
  reroute_cost: number;
  savings: number;
  match_status: MatchStatus;
  created_at: string;
}

export interface Delivery {
  id: number;
  match_id: number;
  tracking_code: string;
  delivery_status: DeliveryStatus;
  collected_at: string | null;
  delivered_at: string | null;
  created_at: string;
}
