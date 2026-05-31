import { createStore } from "zustand/vanilla";
import type { AddressView, CheckoutStateView, OrderConfirmationView } from "./types";

const initial: CheckoutStateView = {
  step: "address",
  shippingAddress: null,
  billingAddress: null,
  shippingMethodId: null,
};

const store = createStore<CheckoutStateView>()(() => ({ ...initial }));

export const checkoutApi = {
  getCheckoutState(): CheckoutStateView {
    return store.getState();
  },

  setShippingAddress(address: AddressView): void {
    store.setState({ shippingAddress: address, step: "shipping" });
  },

  setBillingAddress(address: AddressView): void {
    store.setState({ billingAddress: address });
  },

  setShippingMethod(methodId: string): void {
    store.setState({ shippingMethodId: methodId, step: "payment" });
  },

  async placeOrder(): Promise<OrderConfirmationView> {
    store.setState({ step: "complete" });
    return {
      orderId: `ord_${Date.now().toString(36)}`,
      total: 0,
      placedAt: new Date().toISOString(),
    };
  },

  reset(): void {
    store.setState({ ...initial });
  },

  subscribe(listener: () => void): () => void {
    return store.subscribe(listener);
  },
};
