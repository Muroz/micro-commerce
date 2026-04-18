import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

const ProductsApp = lazy(() => import("products/ProductsApp"));
const CartApp = lazy(() => import("cart/CartApp"));
const CartBadge = lazy(() => import("cart/CartBadge"));
const CheckoutApp = lazy(() => import("checkout/CheckoutApp"));

function Layout() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "1rem" }}>
      <header
        style={{
          borderBottom: "1px solid #ddd",
          paddingBottom: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Microfrontend Store</h1>
        <nav style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
          <Link to="/">Products</Link>
          <Link to="/cart">
            Cart{" "}
            <Suspense fallback={null}>
              <CartBadge />
            </Suspense>
          </Link>
          <Link to="/checkout">Checkout</Link>
        </nav>
      </header>
      <main>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/*" element={<ProductsApp />} />
            <Route path="/cart/*" element={<CartApp />} />
            <Route path="/checkout/*" element={<CheckoutApp />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
