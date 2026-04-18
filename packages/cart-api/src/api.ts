import { createStore } from "zustand/vanilla";
import type { CartItemInternal, CartItemView } from "./types";

interface CartState {
  items: CartItemInternal[];
}

const store = createStore<CartState>()(() => ({
  items: [],
}));

function toView(item: CartItemInternal): CartItemView {
  return {
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  };
}

export const cartApi = {
  addItem(
    productId: string,
    name: string,
    price: number,
    quantity: number = 1
  ): void {
    store.setState((state) => {
      const existing = state.items.find((i) => i.productId === productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, { productId, name, price, quantity }] };
    });
  },

  removeItem(productId: string): void {
    store.setState((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }));
  },

  getItems(): CartItemView[] {
    return store.getState().items.map(toView);
  },

  getCount(): number {
    return store.getState().items.reduce((sum, i) => sum + i.quantity, 0);
  },

  getTotal(): number {
    return store
      .getState()
      .items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  clear(): void {
    store.setState({ items: [] });
  },

  subscribe(listener: () => void): () => void {
    return store.subscribe(listener);
  },
};
