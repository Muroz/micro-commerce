import type { CartItemView } from "@mfe/cart-api";

interface CartSummaryProps {
  items: CartItemView[];
}

export default function CartSummary({ items }: CartSummaryProps) {
  return (
    <div>
      <h2>Cart Summary</h2>
      <p>{items.length} item(s) in cart</p>
    </div>
  );
}
