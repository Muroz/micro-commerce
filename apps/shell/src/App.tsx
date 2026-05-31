import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { RemoteErrorBoundary } from "./RemoteErrorBoundary";

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
            <RemoteErrorBoundary remote="cart" fallback={null}>
              <Suspense fallback={null}>
                <CartBadge />
              </Suspense>
            </RemoteErrorBoundary>
          </Link>
          <Link to="/checkout">Checkout</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route
            path="/*"
            element={
              <RemoteErrorBoundary remote="products">
                <Suspense fallback={<div>Loading...</div>}>
                  <ProductsApp />
                </Suspense>
              </RemoteErrorBoundary>
            }
          />
          <Route
            path="/cart/*"
            element={
              <RemoteErrorBoundary remote="cart">
                <Suspense fallback={<div>Loading...</div>}>
                  <CartApp />
                </Suspense>
              </RemoteErrorBoundary>
            }
          />
          <Route
            path="/checkout/*"
            element={
              <RemoteErrorBoundary remote="checkout">
                <Suspense fallback={<div>Loading...</div>}>
                  <CheckoutApp />
                </Suspense>
              </RemoteErrorBoundary>
            }
          />
        </Routes>
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
