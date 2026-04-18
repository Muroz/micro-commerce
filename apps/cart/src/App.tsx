import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { cartApi } from "@mfe/cart-api";
import type { CartItemView } from "@mfe/cart-api";
import CartView from "./pages/CartView";
import CartSummary from "./pages/CartSummary";

export default function CartApp() {
  const [items, setItems] = useState<CartItemView[]>(cartApi.getItems());

  useEffect(() => {
    return cartApi.subscribe(() => {
      setItems(cartApi.getItems());
    });
  }, []);

  return (
    <Routes>
      <Route index element={<CartView items={items} />} />
      <Route path="summary" element={<CartSummary items={items} />} />
    </Routes>
  );
}
