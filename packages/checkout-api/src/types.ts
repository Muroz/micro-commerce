/**
 * Public view of the in-flight checkout. Mutating fields belong to the
 * Checkout domain only — consumers read this to render confirmations or
 * resume an interrupted flow, but never write it directly.
 */
export interface CheckoutStateView {
  step: "address" | "shipping" | "payment" | "review" | "complete";
  shippingAddress: AddressView | null;
  billingAddress: AddressView | null;
  shippingMethodId: string | null;
}

export interface AddressView {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface OrderConfirmationView {
  orderId: string;
  total: number;
  placedAt: string;
}
