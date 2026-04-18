import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cartApi } from "@mfe/cart-api";
import { eventBus, Events } from "@mfe/event-bus";

export default function CheckoutForm() {
  const navigate = useNavigate();
  const items = cartApi.getItems();
  const total = cartApi.getTotal();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    cartApi.clear();
    eventBus.emit(Events.CHECKOUT_COMPLETE, { name, email, total });
    navigate("confirmation");
  };

  return (
    <div>
      <h2>Checkout</h2>
      {items.length === 0 ? (
        <p>No items to checkout.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <p>
            <strong>
              {items.length} item(s) — Total: ${total.toFixed(2)}
            </strong>
          </p>
          <div style={{ marginBottom: "0.5rem" }}>
            <label>
              Name:{" "}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <label>
              Email:{" "}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit">Place Order</button>
        </form>
      )}
    </div>
  );
}
