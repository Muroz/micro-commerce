import { Link } from "react-router-dom";
import { cartApi } from "@mfe/cart-api";
import type { CartItemView } from "@mfe/cart-api";

interface CartViewProps {
  items: CartItemView[];
}

export default function CartView({ items }: CartViewProps) {
  const total = cartApi.getTotal();

  return (
    <div>
      <h2>Shopping Cart</h2>
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #ddd",
                padding: "0.75rem",
                borderRadius: "8px",
                marginBottom: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                <strong>{item.name}</strong> x {item.quantity} — $
                {(item.price * item.quantity).toFixed(2)}
              </span>
              <button onClick={() => cartApi.removeItem(item.productId)}>
                Remove
              </button>
            </div>
          ))}
          <p>
            <strong>Total: ${total.toFixed(2)}</strong>
          </p>
          <Link to="/checkout">Proceed to Checkout</Link>
        </>
      )}
    </div>
  );
}
