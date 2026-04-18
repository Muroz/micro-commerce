import { useEffect, useState } from "react";
import { cartApi } from "@mfe/cart-api";

export default function CartBadge() {
  const [count, setCount] = useState(cartApi.getCount());

  useEffect(() => {
    return cartApi.subscribe(() => {
      setCount(cartApi.getCount());
    });
  }, []);

  if (count === 0) return null;

  return (
    <span
      style={{
        backgroundColor: "#e53e3e",
        color: "white",
        borderRadius: "999px",
        padding: "0.1rem 0.4rem",
        fontSize: "0.75rem",
        fontWeight: "bold",
      }}
    >
      {count}
    </span>
  );
}
