# E-Commerce Platform Domain Decomposition

This document defines the full set of domains an e-commerce platform can be decomposed into. Each domain has clear boundaries, a team owner, a public API contract, and a gradual buildout path. The architecture follows the domain API pattern implemented in this project — each domain encapsulates its own state behind a public API, exposed as a Module Federation remote module from the owning app (e.g., `cart/cartApi` is exposed from the cart remote). Cross-cutting infrastructure like `@mfe/event-bus` remains a shared Module Federation singleton.

---

## Domains

### 1. Shell / Platform

**Owner:** Platform team
**Package:** None (no domain API — it's the orchestrator)
**App:** `apps/shell`
**Responsibility:** Layout, navigation, routing, widget placement, error boundaries. Zero business logic.

**Capabilities:**
- Global navigation and responsive layout
- Route registration for all domain apps
- Widget slot system (header, sidebar, footer, modals)
- Error boundaries per remote (graceful degradation if a remote is down)
- Feature flags integration point
- Analytics shell (page view tracking, initializing providers)

---

### 2. Product Catalog

**Owner:** Catalog team
**Package:** `@mfe/catalog-api`
**App:** `apps/products`
**Responsibility:** Product discovery, search, filtering, product detail, and product data.

**Boundaries:**
- Owns product data (title, description, price, images, variants, categories)
- Does NOT own inventory (that's Inventory domain)
- Does NOT own pricing rules (that's Promotions domain)
- Does NOT own reviews (that's Reviews domain)

**API contract:**
```ts
catalogApi.getProduct(productId): ProductView | null
catalogApi.searchProducts(query, filters): ProductView[]
catalogApi.getCategories(): Category[]
catalogApi.subscribe(listener): () => void
```

**Public types:**
```ts
interface ProductView {
  id: string;
  name: string;
  slug: string;
  price: number;        // display price (after promotions)
  basePrice: number;    // original price
  imageUrl: string;
  category: string;
  inStock: boolean;     // reads from inventory-api
}
```

**Widgets exposed:**
- `ProductCard` — renders a single product card (for use in recommendations, search results)
- `ProductQuickView` — modal preview

**Events emitted:**
- `catalog:product-viewed` — for analytics/recommendations

**Gradual buildout:**
1. Static product list (current state)
2. Product detail page with variants
3. Search with filters (category, price range)
4. Category navigation
5. Recently viewed products

---

### 3. Cart

**Owner:** Cart team
**Package:** `@mfe/cart-api` (exists)
**App:** `apps/cart`
**Responsibility:** Cart state, add/remove/update items, cart persistence, cart-level promotions.

**Boundaries:**
- Owns cart state and line item management
- Does NOT own product data (reads from catalog-api for display)
- Does NOT own pricing/discounts calculation (reads from promotions-api)
- Does NOT own inventory validation (reads from inventory-api)

**API contract (current + future):**
```ts
cartApi.addItem(productId, name, price, quantity?): void
cartApi.removeItem(productId): void
cartApi.updateQuantity(productId, quantity): void
cartApi.getItems(): CartItemView[]
cartApi.getCount(): number
cartApi.getTotal(): number
cartApi.getSubtotal(): number
cartApi.getDiscount(): number
cartApi.applyPromoCode(code): Promise<boolean>
cartApi.clear(): void
cartApi.subscribe(listener): () => void
```

**Widgets exposed:**
- `CartBadge` — item count badge (exists)
- `MiniCart` — dropdown cart preview on hover
- `CartSummary` — order summary sidebar

**Gradual buildout:**
1. Add/remove items, badge (current state)
2. Quantity updates
3. Promo code application (calls promotions-api)
4. Cart persistence (localStorage, then API-backed)
5. Saved carts / wishlisting (or separate Wishlist domain)
6. Cart-level shipping estimate

---

### 4. Checkout

**Owner:** Checkout team
**Package:** `@mfe/checkout-api`
**App:** `apps/checkout`
**Responsibility:** Checkout flow orchestration, address collection, shipping method selection, order placement.

**Boundaries:**
- Owns the checkout flow/steps and order submission
- Does NOT own payment processing (that's Payments domain)
- Does NOT own shipping rate calculation (that's Shipping domain)
- Does NOT own address book (that's Account domain)
- Reads cart state from cart-api

**API contract:**
```ts
checkoutApi.getCheckoutState(): CheckoutState
checkoutApi.setShippingAddress(address): void
checkoutApi.setBillingAddress(address): void
checkoutApi.setShippingMethod(methodId): void
checkoutApi.placeOrder(): Promise<OrderConfirmation>
checkoutApi.subscribe(listener): () => void
```

**Events emitted:**
- `checkout:complete` — order placed (exists)
- `checkout:step-changed` — analytics

**Gradual buildout:**
1. Simple form + order placement (current state)
2. Multi-step checkout (address → shipping → payment → review)
3. Guest checkout vs. authenticated checkout
4. Address autocomplete
5. Order review before submission
6. Express checkout (saved payment methods)

---

### 5. Payments

**Owner:** Payments team
**Package:** `@mfe/payments-api`
**App:** `apps/payments` (or embedded in checkout as widget)
**Responsibility:** Payment method management, payment processing, PCI-compliant form rendering.

**Boundaries:**
- Owns payment method collection UI (credit card form, PayPal button, etc.)
- Owns payment method storage (tokenization)
- Owns payment intent creation and confirmation
- Does NOT own checkout flow orchestration (that's Checkout)
- Does NOT own order creation (that's Orders)

**API contract:**
```ts
paymentsApi.getPaymentMethods(): PaymentMethodView[]
paymentsApi.getSelectedMethod(): PaymentMethodView | null
paymentsApi.selectMethod(methodId): void
paymentsApi.processPayment(amount, currency): Promise<PaymentResult>
paymentsApi.subscribe(listener): () => void
```

**Widgets exposed:**
- `PaymentForm` — PCI-compliant card input (rendered inside checkout)
- `PaymentMethodSelector` — saved payment methods list
- `PayPalButton`, `ApplePayButton` — alternative payment triggers

**Gradual buildout:**
1. Simple credit card form (stripe elements or similar)
2. Payment method selection
3. Saved payment methods
4. Alternative methods (PayPal, Apple Pay, Google Pay)
5. Installment payments / BNPL
6. Refund status display (in order history)

---

### 6. Orders

**Owner:** Orders team
**Package:** `@mfe/orders-api`
**App:** `apps/orders`
**Responsibility:** Order history, order detail, order tracking, returns.

**Boundaries:**
- Owns order data (status, line items, totals, timestamps)
- Owns order tracking state
- Does NOT own payment processing (reads payment status from payments-api)
- Does NOT own shipping tracking details (reads from shipping-api)
- Does NOT own product data (references products by ID)

**API contract:**
```ts
ordersApi.getOrders(page?, limit?): OrderSummaryView[]
ordersApi.getOrder(orderId): OrderDetailView | null
ordersApi.getRecentOrder(): OrderSummaryView | null
ordersApi.requestReturn(orderId, items): Promise<ReturnRequest>
ordersApi.subscribe(listener): () => void
```

**Widgets exposed:**
- `RecentOrderBanner` — "Your order shipped!" banner in shell
- `OrderStatusBadge` — small status indicator

**Events emitted:**
- `orders:status-changed` — for notifications

**Gradual buildout:**
1. Order confirmation page (exists as checkout confirmation)
2. Order history list
3. Order detail with line items
4. Order tracking integration
5. Return/exchange flow
6. Reorder functionality

---

### 7. Account / Profile

**Owner:** Account team
**Package:** `@mfe/account-api`
**App:** `apps/account`
**Responsibility:** User profile, address book, preferences, account settings.

**Boundaries:**
- Owns profile data (name, email, phone, avatar)
- Owns address book (shipping/billing addresses)
- Owns user preferences (language, currency, notifications)
- Does NOT own authentication (that's Auth)
- Does NOT own order history (that's Orders)
- Does NOT own payment methods (that's Payments)

**API contract:**
```ts
accountApi.getProfile(): ProfileView
accountApi.updateProfile(updates): Promise<void>
accountApi.getAddresses(): AddressView[]
accountApi.addAddress(address): Promise<AddressView>
accountApi.deleteAddress(addressId): Promise<void>
accountApi.getDefaultAddress(): AddressView | null
accountApi.subscribe(listener): () => void
```

**Widgets exposed:**
- `AvatarMenu` — user avatar + dropdown in header
- `AddressPicker` — address selection (used by checkout)

**Gradual buildout:**
1. Profile display and edit
2. Address book CRUD
3. Default address/payment selection
4. Notification preferences
5. Account deletion / data export (GDPR)
6. Loyalty program display

---

### 8. Auth / Identity

**Owner:** Auth team
**Package:** `@mfe/auth-api` (evolves from current `@mfe/user-api`)
**App:** `apps/auth` (login/register pages) or shell-embedded modals
**Responsibility:** Authentication, session management, registration, password reset.

**Boundaries:**
- Owns login/register/logout flows
- Owns session tokens and refresh logic
- Owns OAuth integrations (Google, Apple, etc.)
- Does NOT own profile data (that's Account)
- Does NOT own authorization/permissions (that's a backend concern)

**API contract (extends current user-api):**
```ts
authApi.getUser(): AuthUser | null
authApi.isAuthenticated(): boolean
authApi.login(email, password): Promise<AuthResult>
authApi.register(data): Promise<AuthResult>
authApi.logout(): void
authApi.refreshToken(): Promise<void>
authApi.loginWithProvider(provider): Promise<AuthResult>
authApi.subscribe(listener): () => void
```

**Widgets exposed:**
- `LoginModal` — triggered by any MFE when auth is required
- `AuthGate` — wrapper that shows login if unauthenticated

**Events emitted:**
- `auth:logged-in` — user authenticated
- `auth:logged-out` — session ended
- `auth:session-expired` — token expired

**Gradual buildout:**
1. Simple user state (current state)
2. Login/register forms
3. OAuth providers
4. Session refresh
5. MFA / 2FA
6. Passwordless / magic link

---

### 9. Search

**Owner:** Search team
**Package:** `@mfe/search-api`
**App:** `apps/search` (or widget-only, no full page)
**Responsibility:** Global search, autocomplete, search results, search analytics.

**Boundaries:**
- Owns search query execution and result ranking
- Owns autocomplete/suggestions
- Owns search filters UI
- Does NOT own product data (indexes it, reads from catalog)
- Does NOT own category taxonomy (reads from catalog)

**API contract:**
```ts
searchApi.search(query, filters?): Promise<SearchResults>
searchApi.suggest(partial): Promise<Suggestion[]>
searchApi.getRecentSearches(): string[]
searchApi.clearRecentSearches(): void
searchApi.subscribe(listener): () => void
```

**Widgets exposed:**
- `SearchBar` — global search input with autocomplete (in shell header)
- `SearchResults` — results grid/list
- `SearchFilters` — sidebar filters

**Gradual buildout:**
1. Basic keyword search
2. Autocomplete/typeahead
3. Faceted filters (price, category, brand)
4. Search analytics (popular queries, no-results tracking)
5. Personalized search (based on user history)
6. Visual search / image search

---

### 10. Inventory

**Owner:** Inventory/Supply team
**Package:** `@mfe/inventory-api`
**App:** None (API-only, no customer-facing UI)
**Responsibility:** Stock availability, low-stock alerts, inventory reservations during checkout.

**Boundaries:**
- Owns stock counts per product/variant
- Owns reservation logic (hold stock during checkout)
- Does NOT own product catalog data
- Does NOT own warehouse/fulfillment

**API contract:**
```ts
inventoryApi.checkAvailability(productId): AvailabilityView
inventoryApi.checkBulkAvailability(productIds): Map<string, AvailabilityView>
inventoryApi.reserveStock(productId, quantity): Promise<Reservation>
inventoryApi.releaseReservation(reservationId): Promise<void>
inventoryApi.subscribe(listener): () => void
```

**Gradual buildout:**
1. Simple in-stock / out-of-stock boolean
2. Quantity-based availability ("Only 3 left")
3. Stock reservation during checkout
4. Back-in-stock notifications
5. Multi-warehouse availability
6. Pre-order support

---

### 11. Promotions / Pricing

**Owner:** Marketing/Pricing team
**Package:** `@mfe/promotions-api`
**App:** None (API + widgets only)
**Responsibility:** Discount rules, promo codes, sales, bundle pricing, loyalty rewards.

**Boundaries:**
- Owns pricing rules (percentage off, fixed discount, BOGO, bundles)
- Owns promo code validation
- Owns sale banners and promotional UI
- Does NOT own base product prices (that's Catalog)
- Does NOT own cart totals calculation (provides discount amounts to cart-api)

**API contract:**
```ts
promotionsApi.validatePromoCode(code): Promise<PromoResult>
promotionsApi.getActivePromotions(): PromotionView[]
promotionsApi.calculateDiscount(items): DiscountBreakdown
promotionsApi.subscribe(listener): () => void
```

**Widgets exposed:**
- `PromoBanner` — site-wide sale banner in shell header
- `PromoCodeInput` — promo code field (used in cart/checkout)
- `SaleBadge` — "20% OFF" badge on product cards

**Gradual buildout:**
1. Simple promo code validation
2. Percentage/fixed discounts
3. Automatic promotions (e.g., "Buy 2 get 1 free")
4. Site-wide sale banners
5. Tiered pricing / volume discounts
6. Loyalty points redemption

---

### 12. Shipping

**Owner:** Logistics team
**Package:** `@mfe/shipping-api`
**App:** None (API + widgets only, used inside checkout)
**Responsibility:** Shipping rate calculation, method selection, delivery estimates, tracking.

**Boundaries:**
- Owns shipping rate calculation
- Owns delivery time estimates
- Owns carrier integrations (UPS, FedEx, etc.)
- Does NOT own order state (that's Orders)
- Does NOT own address validation (that's Account or a utility)

**API contract:**
```ts
shippingApi.getRates(address, items): Promise<ShippingRate[]>
shippingApi.getEstimatedDelivery(rateId): DeliveryEstimate
shippingApi.trackShipment(trackingNumber): Promise<TrackingInfo>
shippingApi.subscribe(listener): () => void
```

**Widgets exposed:**
- `ShippingMethodSelector` — radio list of shipping options (used in checkout)
- `DeliveryEstimate` — "Arrives by Friday" inline text
- `TrackingTimeline` — shipment progress visualization

**Gradual buildout:**
1. Flat-rate shipping
2. Address-based rate calculation
3. Multiple carrier options
4. Real-time tracking
5. In-store pickup option
6. Same-day / express delivery

---

### 13. Reviews & Ratings

**Owner:** Community/UGC team
**Package:** `@mfe/reviews-api`
**App:** `apps/reviews` (or widget-only)
**Responsibility:** Product reviews, ratings, Q&A, review moderation.

**Boundaries:**
- Owns review content, ratings, and helpfulness votes
- Owns review submission flow
- Does NOT own product data (references by productId)
- Does NOT own user profiles (references by userId)

**API contract:**
```ts
reviewsApi.getProductReviews(productId, page?): Promise<ReviewsPage>
reviewsApi.getAverageRating(productId): RatingView
reviewsApi.submitReview(productId, review): Promise<ReviewView>
reviewsApi.voteHelpful(reviewId): Promise<void>
reviewsApi.subscribe(listener): () => void
```

**Widgets exposed:**
- `StarRating` — average rating display (on product cards)
- `ReviewSummary` — rating breakdown (on product detail)
- `ReviewForm` — submit a review
- `ReviewList` — paginated reviews

**Gradual buildout:**
1. Display average rating on product cards
2. Review list on product detail page
3. Review submission form
4. Rating breakdown (5-star histogram)
5. Photo/video reviews
6. Q&A section
7. Review moderation tools (admin)

---

### 14. Notifications

**Owner:** Platform team
**Package:** `@mfe/notifications-api`
**App:** None (widget-only)
**Responsibility:** In-app notifications, toast messages, notification center, push notification registration.

**Boundaries:**
- Owns notification display and lifecycle
- Owns notification preferences (which notifications to show)
- Does NOT own the business events that trigger notifications (other domains emit events)
- Does NOT own email/SMS delivery (backend concern)

**API contract:**
```ts
notificationsApi.show(notification): string  // returns notificationId
notificationsApi.dismiss(notificationId): void
notificationsApi.getUnreadCount(): number
notificationsApi.getNotifications(): NotificationView[]
notificationsApi.markAsRead(notificationId): void
notificationsApi.subscribe(listener): () => void
```

**Widgets exposed:**
- `NotificationBell` — bell icon with unread count (in shell header)
- `NotificationCenter` — dropdown/panel listing all notifications
- `ToastContainer` — toast message area

**Gradual buildout:**
1. Toast messages for actions (e.g., "Added to cart")
2. Notification bell with unread count
3. Notification center panel
4. Persistent notifications (read/unread)
5. Push notification opt-in
6. Notification preferences

---

### 15. Design System

**Owner:** Platform/Design team
**Package:** `@mfe/design-system`
**App:** None (package only — no runtime state, no API)
**Responsibility:** Shared UI components, tokens, and patterns.

**Boundaries:**
- Owns visual components (Button, Input, Modal, Card, etc.)
- Owns design tokens (colors, spacing, typography, breakpoints)
- Owns layout primitives (Grid, Stack, Container)
- Does NOT own business logic or domain state
- Does NOT own domain-specific components (ProductCard is Catalog's responsibility, using DS primitives)

**Package structure:**
```ts
// Not a domain API — just component exports
export { Button, Input, Select, Modal, Card, Badge, Toast } from "./components";
export { theme, tokens } from "./tokens";
export { Grid, Stack, Container, Flex } from "./layout";
```

**Module Federation consideration:** The design system is a shared package (like React) — add to MF `shared` config as a singleton so all MFEs render consistent UI without bundling duplicates.

**Gradual buildout:**
1. Design tokens (colors, spacing, typography)
2. Basic inputs (Button, Input, Select, Checkbox)
3. Layout primitives (Grid, Stack, Container)
4. Feedback (Toast, Modal, Alert, Skeleton)
5. Data display (Table, Card, Badge, Avatar)
6. Navigation (Tabs, Breadcrumb, Pagination)
7. Theming (dark mode, brand customization)
8. Documentation site (Storybook)

---

### 16. Analytics

**Owner:** Data team
**Package:** `@mfe/analytics-api`
**App:** None (package only)
**Responsibility:** Event tracking, page views, e-commerce tracking, A/B test assignment.

**Boundaries:**
- Owns tracking event dispatch (to analytics backend)
- Owns user identification and session tracking
- Owns A/B test variant assignment
- Does NOT own business events (listens to them via event-bus)
- Does NOT own UI (invisible)

**API contract:**
```ts
analyticsApi.track(eventName, properties): void
analyticsApi.page(pageName, properties): void
analyticsApi.identify(userId, traits): void
analyticsApi.getVariant(experimentId): string
```

**Gradual buildout:**
1. Page view tracking
2. E-commerce events (product viewed, added to cart, purchased)
3. User identification
4. A/B test variant assignment
5. Custom event tracking
6. Revenue attribution

---

## Source of Truth & Data Ownership

### Product Data: Who Owns What

The "product" is the central entity in e-commerce, but no single domain owns all of it. What a user sees as "a product" is actually a **composite view assembled from multiple domain sources**:

| Data | Source of Truth | Who writes it | Who reads it |
|------|----------------|---------------|--------------|
| Name, description, images, slug | **Catalog** | Catalog team (via CMS/admin) | Everyone |
| Base price | **Catalog** | Catalog team | Promotions, Cart, Checkout |
| Display price (after discounts) | **Promotions** | Promotions engine | Catalog (for display), Cart |
| Stock count, availability | **Inventory** | Warehouse/supply systems | Catalog (for badges), Cart (for validation), Checkout (for reservation) |
| Average rating, review count | **Reviews** | Customers (via submissions) | Catalog (for display on product cards) |
| Variants (size, color) | **Catalog** | Catalog team | Cart (user selects variant), Inventory (stock per variant) |

**The Catalog domain is the source of truth for product identity** — it defines what a product *is* (id, name, description, images, category). Other domains *enrich* the product view with their own data:

```
Catalog provides:     { id, name, slug, basePrice, images, category, variants }
Inventory enriches:   + { inStock, quantityAvailable }
Promotions enriches:  + { displayPrice, discountPercentage, saleBadge }
Reviews enriches:     + { averageRating, reviewCount }
```

When the product detail page renders, Catalog assembles the composite view by calling other domain APIs:

```ts
// Inside catalog-api (simplified)
async function getProductView(productId): ProductView {
  const product = getBaseProduct(productId);                    // own data
  const availability = inventoryApi.checkAvailability(productId); // from Inventory
  const discount = promotionsApi.calculateDiscount([product]);    // from Promotions
  const rating = reviewsApi.getAverageRating(productId);         // from Reviews

  return {
    ...product,
    inStock: availability.available,
    price: discount.finalPrice,
    basePrice: product.basePrice,
    averageRating: rating.value,
  };
}
```

This means Catalog *reads* from other domains for display, but each domain remains the sole writer of its own data.

---

## How Domains Interact: Explicit Flows

### Flow 1: "Add to Cart" (Catalog → Cart → Inventory)

```
User clicks "Add to Cart" on product page
    │
    ▼
[Catalog UI] calls cartApi.addItem(productId, name, price)
    │
    ▼
[Cart API] stores the line item in its Zustand store
    │
    ▼
[Cart API] (future) calls inventoryApi.checkAvailability(productId)
    │                  to validate stock before confirming
    ▼
[Cart Badge widget] re-renders via cartApi.subscribe()
```

**Who depends on whom:**
- Catalog depends on `@mfe/cart-api` (to call `addItem`)
- Cart depends on `@mfe/inventory-api` (to validate stock — future)
- Cart does NOT depend on Catalog (it receives primitives: id, name, price)

---

### Flow 2: "Checkout" (Cart → Checkout → Payments → Shipping → Orders)

```
User navigates to /checkout
    │
    ▼
[Checkout UI] reads cartApi.getItems() and cartApi.getTotal()
    │
    ▼
[Checkout UI] renders accountApi.getDefaultAddress() (pre-fill)
              renders shippingApi widget (ShippingMethodSelector)
              renders paymentsApi widget (PaymentForm)
    │
    ▼
User fills form and clicks "Place Order"
    │
    ▼
[Checkout API] orchestrates:
    1. inventoryApi.reserveStock() — hold items
    2. shippingApi.getRates(address, items) — confirm shipping cost
    3. paymentsApi.processPayment(total, currency) — charge
    4. checkoutApi.placeOrder() → creates order via ordersApi
    5. cartApi.clear() — empty the cart
    │
    ▼
[Event Bus] emits checkout:complete
    │
    ▼
[Notifications] shows toast "Order placed!"
[Analytics] tracks purchase event
[Orders API] stores the new order
```

**Who depends on whom:**
- Checkout depends on: `cart-api`, `account-api`, `shipping-api`, `payments-api`, `inventory-api`, `orders-api`
- Checkout is the **orchestrator** of the purchase flow — it coordinates multiple domains but doesn't own their data
- Payments, Shipping, Inventory are called by Checkout but don't know about each other

---

### Flow 3: "Product Display Price" (Catalog ← Promotions ← Inventory)

```
Catalog page loads product list
    │
    ▼
[Catalog API] fetches base products from its own store
    │
    ▼
[Catalog API] calls promotionsApi.calculateDiscount(items)
    │            to get display prices
    ▼
[Catalog API] calls inventoryApi.checkBulkAvailability(productIds)
    │            to get stock status
    ▼
[Catalog API] returns composite ProductView[] to UI
    │
    ▼
[Catalog UI] renders ProductCards with:
    - price from Promotions (display price)
    - "In Stock" / "Out of Stock" from Inventory
    - SaleBadge widget from Promotions remote (if discounted)
    - StarRating widget from Reviews remote
```

**Who depends on whom:**
- Catalog depends on: `promotions-api` (for pricing), `inventory-api` (for stock), `reviews-api` (for ratings)
- Promotions, Inventory, Reviews don't know about Catalog — they answer queries about product IDs

---

### Flow 4: "Auth Required" (Any MFE → Auth)

```
User clicks "Write a Review" (unauthenticated)
    │
    ▼
[Reviews UI] checks authApi.isAuthenticated() → false
    │
    ▼
[Reviews UI] renders <LoginModal> widget from auth remote
    │           OR emits event: auth:login-required
    ▼
[Auth Widget] shows login form
    │
    ▼
User logs in successfully
    │
    ▼
[Auth API] updates state, emits auth:logged-in event
    │
    ▼
[Reviews UI] (subscribed to authApi) re-renders, now shows review form
```

**Who depends on whom:**
- Any domain can depend on `@mfe/auth-api` to check authentication
- Auth domain doesn't know about Reviews, Cart, etc. — it just manages identity
- The `LoginModal` widget is owned by Auth but placed by the consuming domain

---

### Flow 5: "Order Tracking" (Orders → Shipping → Notifications)

```
Backend updates shipment status
    │
    ▼
[Orders API] receives webhook, updates order state
    │
    ▼
[Orders API] emits orders:status-changed event
    │
    ▼
[Notifications] listens for orders:status-changed
    │             shows bell notification + optional push
    ▼
User clicks notification → navigates to /orders/:id
    │
    ▼
[Orders UI] renders order detail
    │
    ▼
[Orders UI] calls shippingApi.trackShipment(trackingNumber)
    │
    ▼
[Shipping widget] renders TrackingTimeline
```

---

## Interaction Rules

1. **Read across boundaries, write only to your own domain.** Cart reads product names from catalog-api for display, but never writes product data. Catalog reads stock from inventory-api, but never writes stock counts.

2. **Depend on APIs, never on internal state.** Products calls `cartApi.addItem()` — it doesn't import cart's Zustand store directly. This is what allows independent deployment.

3. **Widgets render, they don't own cross-domain state.** The `CartBadge` widget reads from `cart-api` and renders. It doesn't accept props from the shell about cart count — the widget owns its own subscription.

4. **Events are for broadcasts, APIs are for actions.** If you know which domain to talk to, call its API. Events are for "something happened, anyone who cares can react" (analytics, notifications).

5. **Orchestration lives in the orchestrating domain.** Checkout orchestrates the purchase flow (calling cart, shipping, payments, orders, inventory). The shell does NOT orchestrate — it just routes.

6. **Circular dependencies are a design smell.** If Cart needs to call Catalog and Catalog needs to call Cart, something is wrong. Resolve by passing data as parameters instead of making the call.

---

## Domain Dependency Map

**Arrow = "calls the API of"**. Arrows are strictly one-directional. If domain A has an arrow to domain B, then A imports B's API as a remote module. B must NEVER import A's API — use the event bus for the reverse direction.

```
                         ┌──────────────────────┐
                         │    Shell/Platform     │
                         │  (routing, layout)    │
                         │  mounts all remotes   │
                         │  calls NO domain APIs │
                         └───────────────────────┘


  ┌──────────────┐         ┌──────────────┐         ┌──────────────────┐
  │   Catalog    │────────▶│     Cart     │◀────────│    Checkout      │
  │  (products)  │         │  (cart-api)  │         │  (checkout-api)  │
  └──────┬───────┘         └──────────────┘         └──┬───┬───┬──────┘
         │                                             │   │   │
         │                                             │   │   │
         ▼                                             ▼   │   ▼
  ┌──────────────┐         ┌──────────────┐  ┌────────────┐│┌──────────────┐
  │  Inventory   │◀────────│  Promotions  │  │  Payments  │││   Orders     │
  └──────────────┘         └──────────────┘  └────────────┘│└──────┬───────┘
         ▲                        ▲                        │       │
         │                        │                        ▼       ▼
         │                        │                 ┌──────────────┐
         └────────────────────────┼─────────────────│   Shipping   │
                                  │                 └──────────────┘
                                  │
                           ┌──────────────┐
                           │    Cart      │
                           │ (reads prices│
                           │  at display) │
                           └──────────────┘


  Standalone (no upstream domain dependencies):
  ┌──────────────┐    ┌──────────────┐
  │   Reviews    │    │    Search    │
  │ (reads from  │    │ (reads from  │
  │  catalog)    │    │  catalog)    │
  └──────────────┘    └──────────────┘
```

### Allowed dependency direction (current + planned)

| Caller (imports API of →) | Callee | Method | Why |
|---------------------------|--------|--------|-----|
| **Catalog** → Cart | `cartApi.addItem()` | Remote module | "Add to Cart" button lives in product pages |
| **Checkout** → Cart | `cartApi.getItems()`, `.getTotal()`, `.clear()` | Remote module | Checkout reads cart state and clears after purchase |
| **Checkout** → Payments | `paymentsApi.charge()` | Remote module (future) | Process payment during checkout |
| **Checkout** → Orders | `ordersApi.create()` | Remote module (future) | Create order record after payment |
| **Checkout** → Shipping | `shippingApi.getRates()` | Remote module (future) | Display shipping options |
| **Checkout** → Inventory | `inventoryApi.reserve()` | Remote module (future) | Reserve stock during purchase |
| **Catalog** → Inventory | `inventoryApi.getStock()` | Remote module (future) | Show "in stock" on product pages |
| **Cart** → Promotions | `promotionsApi.getDiscount()` | Remote module (future) | Apply promo codes to cart |
| **Orders** → Shipping | `shippingApi.track()` | Remote module (future) | Show tracking info on order detail |
| **Reviews** → Catalog | `catalogApi.getProduct()` | Remote module (future) | Display product info alongside review |
| **Search** → Catalog | `catalogApi.searchProducts()` | Remote module (future) | Search results reference catalog data |

### Forbidden directions (would create circular dependencies)

| Forbidden | Why | Use instead |
|-----------|-----|-------------|
| Cart → Catalog | Cart doesn't need product data — it receives `name` and `price` as parameters in `addItem()` | Pass data as arguments |
| Cart → Checkout | Cart has no reason to know about checkout flow | `eventBus.emit(Events.CHECKOUT_COMPLETE)` for broadcasts |
| Payments → Checkout | Payment result flows back via return value, not by importing checkout | Return `Promise<PaymentResult>` from `paymentsApi.charge()` |
| Orders → Checkout | Order confirmation is a return value, not a dependency | Return `Promise<Order>` from `ordersApi.create()` |
| Inventory → Catalog | Inventory doesn't need product details | Event bus if inventory changes need to propagate |

### Rule of thumb

**Data flows down via API calls, signals flow up via events.** If you're about to add a reverse arrow, ask: can the callee return the data instead? Can the event bus broadcast it?

Cross-cutting (any domain may use, never creates circular deps):
  Auth/Identity, Account, Notifications, Analytics, Design System, Event Bus

---

## Recommended Implementation Order

| Phase | Domains | Rationale |
|-------|---------|-----------|
| 1 (Current) | Shell, Catalog, Cart, Checkout, Auth | Core purchase flow |
| 2 | Design System, Search, Account | UX fundamentals |
| 3 | Payments, Orders, Shipping | Complete order lifecycle |
| 4 | Promotions, Inventory | Business optimization |
| 5 | Reviews, Notifications, Analytics | Engagement & insights |

