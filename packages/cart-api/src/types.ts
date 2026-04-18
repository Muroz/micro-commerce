/**
 * Internal storage type — Cart team can change this freely
 * without impacting consumers. Only the public API surface matters.
 */
interface CartItemInternal {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

/**
 * Public view type — this is the contract.
 * Changing this is a breaking change (major version bump).
 */
export interface CartItemView {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export type { CartItemInternal };
