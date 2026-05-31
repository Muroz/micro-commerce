/**
 * Single source of truth for federated module types. Every consumer that
 * imports from `<remote>/<module>` should add this package to its tsconfig
 * `types` array (or `include`) and `package.json` devDependencies.
 *
 * Adding a new exposed module = add a `declare module` block here.
 */

// --- App shells (default-exported React components) ---

declare module "products/ProductsApp" {
  import type { ComponentType } from "react";
  const Component: ComponentType;
  export default Component;
}

declare module "cart/CartApp" {
  import type { ComponentType } from "react";
  const Component: ComponentType;
  export default Component;
}

declare module "cart/CartBadge" {
  import type { ComponentType } from "react";
  const Component: ComponentType;
  export default Component;
}

declare module "checkout/CheckoutApp" {
  import type { ComponentType } from "react";
  const Component: ComponentType;
  export default Component;
}

// --- Domain APIs (runtime singletons exposed as federated modules) ---

declare module "cart/cartApi" {
  export { cartApi } from "@mfe/cart-api";
  export type { CartItemView } from "@mfe/cart-api";
}

declare module "products/productsApi" {
  export { productsApi } from "@mfe/products-api";
  export type { ProductView } from "@mfe/products-api";
}

declare module "checkout/checkoutApi" {
  export { checkoutApi } from "@mfe/checkout-api";
  export type {
    CheckoutStateView,
    AddressView,
    OrderConfirmationView,
  } from "@mfe/checkout-api";
}
