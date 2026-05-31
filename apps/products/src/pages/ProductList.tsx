import { cartApi } from "cart/cartApi";

const mockProducts = [
  { id: "1", name: "Wireless Headphones", price: 79.99 },
  { id: "2", name: "Mechanical Keyboard", price: 149.99 },
  { id: "3", name: "USB-C Hub", price: 49.99 },
];

export default function ProductList() {
  const handleAddToCart = (product: (typeof mockProducts)[number]) => {
    cartApi.addItem(product.id, product.name, product.price);
  };

  return (
    <div>
      <h2>Products</h2>
      <div style={{ display: "grid", gap: "1rem" }}>
        {mockProducts.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #ddd",
              padding: "1rem",
              borderRadius: "8px",
            }}
          >
            <h3>{p.name}</h3>
            <p>${p.price.toFixed(2)}</p>
            <button onClick={() => handleAddToCart(p)}>Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
}
