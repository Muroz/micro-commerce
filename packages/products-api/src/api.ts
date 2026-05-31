import { createStore } from "zustand/vanilla";
import type { ProductView } from "./types";

interface ProductsState {
  products: ProductView[];
}

const seed: ProductView[] = [
  { id: "1", name: "Wireless Headphones", price: 79.99, category: "audio" },
  { id: "2", name: "Mechanical Keyboard", price: 149.99, category: "input" },
  { id: "3", name: "USB-C Hub", price: 49.99, category: "accessories" },
];

const store = createStore<ProductsState>()(() => ({ products: seed }));

export const productsApi = {
  getProduct(productId: string): ProductView | null {
    return store.getState().products.find((p) => p.id === productId) ?? null;
  },

  searchProducts(query: string): ProductView[] {
    const q = query.trim().toLowerCase();
    if (!q) return store.getState().products;
    return store.getState().products.filter((p) => p.name.toLowerCase().includes(q));
  },

  getCategories(): string[] {
    return Array.from(
      new Set(store.getState().products.map((p) => p.category).filter(Boolean) as string[]),
    );
  },

  subscribe(listener: () => void): () => void {
    return store.subscribe(listener);
  },
};
