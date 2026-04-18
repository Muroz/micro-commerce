# Microfrontend Example

A microfrontend architecture demo using **React**, **Rspack**, **Module Federation**, and **Turborepo**. The project simulates an e-commerce flow with three independently deployable microfrontends coordinated by a shell application, with proper domain boundaries and team ownership separation.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Framework**: React 19
- **Bundler**: Rspack (with native Module Federation support)
- **Routing**: React Router v7
- **Language**: TypeScript

## Project Structure

```
microfrontend-example/
├── apps/
│   ├── shell/              # Host application (port 3000) — Platform team
│   ├── products/           # Products microfrontend (port 3001) — Products team
│   ├── cart/               # Cart microfrontend (port 3002) — Cart team
│   └── checkout/           # Checkout microfrontend (port 3003) — Checkout team
├── packages/
│   ├── cart-api/           # Cart domain API — owned by Cart team
│   ├── user-api/           # User domain API — owned by Auth team
│   ├── event-bus/          # Pub/sub mechanism — owned by Platform team
│   └── tsconfig/           # Shared TypeScript presets
├── turbo.json
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9

### Install & Run

```bash
pnpm install
pnpm dev
```

This starts all four dev servers concurrently via Turborepo. Open [http://localhost:3000](http://localhost:3000) to see the shell.

All four servers must be running — the shell loads each microfrontend by fetching its `remoteEntry.js` at runtime. If a remote's server is down, the shell shows a loading fallback.

### Build

```bash
pnpm build
```

### Run a single microfrontend

```bash
pnpm --filter @mfe/products dev
```

Each microfrontend can run standalone at its own port. In standalone mode, `bootstrap.tsx` wraps the app in its own `<BrowserRouter>`.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Shell (Host) :3000                       │
│  Owned by: Platform team                                     │
│  Owns: layout, nav, routing, widget placement                │
│  Does NOT own: business logic for any domain                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Header                                                 │  │
│  │  [Products]  [Cart ┌───────────┐]  [Checkout]          │  │
│  │                    │ CartBadge │ ◄── from cart remote   │  │
│  │                    └───────────┘                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Route content (one active at a time)                   │  │
│  │  ProductsApp  |  CartApp  |  CheckoutApp               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         │                │                │
    ┌────┴────┐     ┌────┴────┐     ┌────┴─────┐
    │Products │     │  Cart   │     │ Checkout  │
    │ :3001   │     │ :3002   │     │  :3003    │
    └─────────┘     └─────────┘     └──────────┘
         │                │                │
    ┌────┴────────────────┴────────────────┴────┐
    │         Module Federation Singletons       │
    │  @mfe/cart-api  @mfe/user-api  @mfe/event-bus │
    └───────────────────────────────────────────┘
```

### Key Architectural Principles

1. **The shell has no business logic.** It renders the layout, mounts widgets and routes, and delegates everything else to domain APIs and remote apps.

2. **Each domain owns its own API package.** The Cart team owns `@mfe/cart-api` — its state, methods, and public types. Other teams call the API; they never touch cart internals.

3. **Domain API packages are always available.** They're Module Federation singletons loaded before any remote. No lazy-loading race conditions — `cartApi.addItem()` works even if the Cart remote hasn't been visited yet.

4. **Remotes expose UI, not logic.** `apps/cart` exposes `CartApp` (full page) and `CartBadge` (widget). Both read from `@mfe/cart-api` for state. The API package is the single source of truth.

---

## Module Federation

### How It Works

Module Federation allows multiple independently built applications to share code at runtime:

1. **Each remote** (Products, Cart, Checkout) builds a `remoteEntry.js` file — a manifest that tells the host what modules are available.

2. **The shell (host)** declares which remotes it consumes:
   ```js
   remotes: {
     products: "products@http://localhost:3001/remoteEntry.js",
     cart: "cart@http://localhost:3002/remoteEntry.js",
     checkout: "checkout@http://localhost:3003/remoteEntry.js",
   }
   ```

3. **At runtime**, `import("products/ProductsApp")` fetches the remote's `remoteEntry.js`, negotiates shared dependencies, and loads the component.

### Exposing Multiple Modules per Remote

A remote can expose more than one module. The Cart remote exposes both a full-page app and a small widget:

```js
// apps/cart/rspack.config.ts
exposes: {
  "./CartApp": "./src/App.tsx",           // Full page (rendered at /cart)
  "./CartBadge": "./src/widgets/CartBadge.tsx",  // Widget (rendered in shell header)
}
```

The shell mounts these independently:
```tsx
const CartApp = lazy(() => import("cart/CartApp"));      // Route content
const CartBadge = lazy(() => import("cart/CartBadge"));  // Always in header
```

This avoids creating separate micro-apps for small widgets. The Cart team owns both components, deploys them together, and the shell just places them.

### Shared Dependencies

All apps use `eager: false` and rely on the async boundary pattern:

```js
shared: {
  react: { singleton: true, eager: false },
  "react-dom": { singleton: true, eager: false },
  "react-router-dom": { singleton: true, eager: false },
  "@mfe/event-bus": { singleton: true, eager: false, requiredVersion: false },
  "@mfe/cart-api": { singleton: true, eager: false, requiredVersion: false },
  "@mfe/user-api": { singleton: true, eager: false, requiredVersion: false },
}
```

`singleton: true` ensures one instance at runtime. `requiredVersion: false` disables semver checking for workspace packages (pnpm's `workspace:*` isn't valid semver).

### The Async Boundary Pattern

Every app uses a two-file entry point:

```
src/index.tsx  →  import("./bootstrap")   (thin async entry)
src/bootstrap.tsx  →  actual React mount  (real app code)
```

Module Federation needs this async boundary to negotiate shared modules before they're used. Without it, React resolves before federation can redirect it to the shared instance, causing "factory is undefined" errors.

### Lazy Loading Remotes

```tsx
const ProductsApp = lazy(() => import("products/ProductsApp"));
const CartApp = lazy(() => import("cart/CartApp"));
const CheckoutApp = lazy(() => import("checkout/CheckoutApp"));
```

Each remote is fetched only when the user navigates to its route, wrapped in `<Suspense>` for loading states.

---

## Domain API Pattern

### The Problem with Shared State

A naive approach puts all cross-MFE state in a shared store:

```ts
// Shared store — everyone depends on this shape
interface SharedState {
  cartItems: CartItem[];
  user: User | null;
}
```

This creates coupling: if the Cart team renames `CartItem.quantity` to `CartItem.qty`, every app that reads `cartItems` breaks. Teams can't deploy independently because they all share the same data model.

### The Solution: Domain-Owned API Packages

Each domain gets its own package that **encapsulates state behind a public API**:

```
packages/
  cart-api/     # Owned by Cart team
  user-api/     # Owned by Auth team
  event-bus/    # Owned by Platform team
```

The API package contains:
- **Internal types** — the Cart team can change these freely (e.g., rename fields, restructure storage)
- **Public types** — the contract other teams depend on (changing these is a breaking change)
- **API methods** — the public interface (e.g., `addItem`, `getTotal`, `subscribe`)
- **Module-level state** — survives across route navigations because the package is a MF singleton

### Cart API Example

```ts
// packages/cart-api/src/api.ts

// Internal storage — Cart team can restructure freely
interface CartItemInternal {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

// Public view type — this IS the contract
export interface CartItemView {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export const cartApi = {
  addItem(productId: string, name: string, price: number, quantity?: number): void,
  removeItem(productId: string): void,
  getItems(): CartItemView[],
  getCount(): number,
  getTotal(): number,
  clear(): void,
  subscribe(listener: () => void): () => void,
};
```

**What consumers see:** `cartApi.addItem(id, name, price)` — just primitives. No dependency on `CartItem`, no knowledge of internal storage.

**What the Cart team can change without breaking consumers:**
- Rename `CartItemInternal` fields
- Add internal fields (e.g., `addedAt` timestamp, `variant`)
- Change how duplicates are handled (currently merges quantity)
- Add persistence (localStorage, API calls)
- Restructure storage entirely (e.g., use a Map instead of an array)

**What requires a coordinated update (semver major):**
- Changing `addItem`'s signature
- Removing a method
- Changing `CartItemView`'s shape

### User API Example (No UI)

Not every domain needs a remote app. The User/Auth domain is purely a state slice + API:

```ts
// packages/user-api/src/api.ts
export const userApi = {
  getUser(): User | null,
  setUser(user: User): void,
  logout(): void,
  isAuthenticated(): boolean,
  subscribe(listener: () => void): () => void,
};
```

Any MFE can call `userApi.getUser()` — no remote to load, no lifecycle concerns. The Auth team owns this package and can add methods (e.g., `getRole()`, `hasPermission()`) without affecting other teams.

### Why Domain APIs Solve the Lifecycle Problem

With an event bus, if no listener is mounted when an event fires, the event is lost. Domain APIs avoid this entirely:

```
Products page:  cartApi.addItem("abc", "Widget", 9.99)
                    ↓
                cartApi internal state updates immediately
                    ↓
(user navigates to /cart)
                    ↓
Cart mounts:    cartApi.getItems() → returns the item
                cartApi.subscribe() → re-renders on future changes
```

The state lives in the API package (a Module Federation singleton), not in any component. It persists regardless of which route is active or which components are mounted.

---

## Cross-Domain Communication

### When to Use Domain APIs vs. Event Bus

| Scenario | Use | Why |
|----------|-----|-----|
| Products adds item to cart | `cartApi.addItem()` | Direct action on a known domain |
| Cart displays item count | `cartApi.getCount()` + `subscribe` | Reading domain state reactively |
| Checkout clears cart after purchase | `cartApi.clear()` | Direct action on a known domain |
| Checkout notifies "order placed" | `eventBus.emit(CHECKOUT_COMPLETE)` | Broadcast — multiple domains may react |
| Any MFE requests navigation | `eventBus.emit(NAVIGATE)` | Shell concern, not a domain action |

**Rule of thumb:**
- If you know *which domain* you're talking to → call its API directly
- If you're broadcasting *something happened* and don't own the response → use the event bus

### Data Flow in This Project

```
Products                 @mfe/cart-api              Cart UI
   │                          │                       │
   │ cartApi.addItem() ─────▶ │                       │
   │                          │ internal state updates │
   │                          │                        │
   │                          │ ◄── subscribe() ──────│
   │                          │ ────── notify() ─────▶ │
   │                          │                   re-render
   │                          │                        │
   │                          │ ◄── getItems() ───────│
   │                          │ ────── items[] ──────▶ │

Checkout                 @mfe/cart-api             @mfe/event-bus
   │                          │                        │
   │ cartApi.getTotal() ────▶ │                        │
   │ ◀──── total ────────────│                        │
   │                          │                        │
   │ cartApi.clear() ────────▶│                        │
   │                          │                        │
   │ eventBus.emit(CHECKOUT_COMPLETE) ───────────────▶ │
   │                                          (anyone can listen)
```

### Exposed Widgets Pattern

When a domain needs to render UI outside its own route (e.g., cart badge in the header), the remote exposes a widget component via Module Federation:

```
Cart team owns:
  @mfe/cart-api         → state + methods (always available)
  apps/cart/CartApp     → full page at /cart route
  apps/cart/CartBadge   → widget in shell header

Shell renders:
  <CartBadge /> in the header (lazy-loaded from cart remote)
  <CartApp /> at /cart route (lazy-loaded from cart remote)

Both CartBadge and CartApp read from the same cartApi singleton.
```

The shell doesn't know how CartBadge works — it just places it. The Cart team maintains the widget, its styling, and its connection to cart state. If they want to show a total instead of a count, they change `CartBadge.tsx` and deploy the cart remote. No shell changes needed.

### Event Catalog

| Event | Constant | Payload | Producer | Consumer |
|-------|----------|---------|----------|----------|
| `checkout:complete` | `Events.CHECKOUT_COMPLETE` | `{ name, email, total }` | Checkout | Any (e.g., analytics) |
| `shell:navigate` | `Events.NAVIGATE` | `{ path: string }` | Any MFE | Shell |

Note: Cart events (`ADD_TO_CART`, `REMOVE_FROM_CART`) are gone — replaced by direct `cartApi` method calls.

### Domain API Inventory

| Package | Owner | Methods | Has UI? |
|---------|-------|---------|---------|
| `@mfe/cart-api` | Cart team | `addItem`, `removeItem`, `getItems`, `getCount`, `getTotal`, `clear`, `subscribe` | No (UI is in `apps/cart`) |
| `@mfe/user-api` | Auth team | `getUser`, `setUser`, `logout`, `isAuthenticated`, `subscribe` | No (no app yet) |
| `@mfe/event-bus` | Platform team | `eventBus.on`, `eventBus.emit`, `eventBus.off` | No |

---

## Routing

### Shell Owns the Router

The shell provides a single `<BrowserRouter>`. Each MFE uses `<Routes>` with relative paths:

```tsx
// Shell
<BrowserRouter>
  <Routes>
    <Route path="/*" element={<ProductsApp />} />
    <Route path="/cart/*" element={<CartApp />} />
    <Route path="/checkout/*" element={<CheckoutApp />} />
  </Routes>
</BrowserRouter>

// Products remote — no BrowserRouter, inherits from shell
<Routes>
  <Route index element={<ProductList />} />
  <Route path=":id" element={<ProductDetail />} />
</Routes>
```

### Standalone Development

When running a remote independently (e.g., `http://localhost:3001`), its `bootstrap.tsx` wraps the app in its own `<BrowserRouter>`.

---

## Independent Deployments

### Why One Package Per Domain

A single shared contracts package creates a deployment bottleneck — if the Cart team changes it, every app must rebuild. Separate packages per domain enable independent deployability:

```
packages/
  cart-api/     ← Cart team changes this freely
  user-api/     ← Auth team changes this freely
  event-bus/    ← Platform team changes this freely
```

### How Module Federation Enables Independent Deploys

Module Federation resolves shared packages **at runtime**, not build time. When the Cart team deploys a new version:

1. Cart team updates `@mfe/cart-api` (e.g., adds `getItemCount()` method)
2. Cart team bumps version to `1.1.0` (minor — backwards compatible)
3. Cart team rebuilds and deploys `apps/cart` (which bundles the new `@mfe/cart-api`)
4. Other apps still have `@mfe/cart-api@1.0.0` bundled as a fallback
5. At runtime, Module Federation picks the **highest available version** across all loaded remotes
6. All apps get `@mfe/cart-api@1.1.0` — the new method is available, existing methods still work

**No other app needs to rebuild or redeploy.**

### Deployment Scenarios

| Scenario | What changes | Who deploys | Others impacted? |
|----------|-------------|-------------|------------------|
| Cart restructures internal storage | `@mfe/cart-api` (patch), `apps/cart` | Cart team | No — public API unchanged |
| Cart adds `getItemCount()` method | `@mfe/cart-api` (minor), `apps/cart` | Cart team | No — additive, backwards compatible |
| Cart renames `addItem` → `add` | `@mfe/cart-api` (major) | All teams | Yes — coordinated rollout |
| Products adds a new page | `apps/products` only | Products team | No |
| Auth team adds `getRole()` | `@mfe/user-api` (minor) | Auth team | No |
| New "Wishlist" domain | New `@mfe/wishlist-api` + `apps/wishlist` | Wishlist team | No — new package |

### Versioning Strategy

Follow **semver** on all domain API packages:

- **Patch** (1.0.0 → 1.0.1): Internal changes — restructure state, fix bugs, optimize. No API surface change.
- **Minor** (1.0.0 → 1.1.0): Additive changes — new methods, new optional fields on public types. Backwards compatible.
- **Major** (1.0.0 → 2.0.0): Breaking changes — renamed/removed methods, changed public types. Requires coordinated update.

### The Contract Boundary

Each domain API package has a clear boundary between internal and public:

```ts
// INTERNAL — Cart team can change freely (not exported)
interface CartItemInternal {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  addedAt: number;        // ← Cart team added this, no one else knows
  variant?: string;       // ← Cart team added this too
}

// PUBLIC — This is the contract (exported, changing it = major bump)
export interface CartItemView {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}
```

The `toView()` function inside the API maps internal → public, shielding consumers from internal changes.

### Monorepo vs. Independent Repos

This project uses a monorepo for simplicity, but the architecture works with independent repos too:

- In a **monorepo**: domain API packages use `workspace:*` links. All code is co-located, but teams own specific directories.
- In **independent repos**: domain API packages are published to a private npm registry. Each team has their own repo for their app + API package. The shell repo declares remotes pointing to deployed URLs instead of `localhost`.

The key constraint is the same either way: **the API package is the contract boundary**. Teams can change anything behind it without coordinating.

---

## Development Workflow

### Port Assignments

| App | Port | URL |
|-----|------|-----|
| Shell (host) | 3000 | http://localhost:3000 |
| Products | 3001 | http://localhost:3001 |
| Cart | 3002 | http://localhost:3002 |
| Checkout | 3003 | http://localhost:3003 |

### Turbo Pipeline

- **`dev`**: Depends on `^build` (API packages build first), runs persistently
- **`build`**: Depends on `^build`, outputs to `dist/`
- **`lint`**: TypeScript type-checking via `tsc --noEmit`

### HMR

Hot Module Replacement works within each microfrontend — in standalone mode and when loaded through the shell.

---

## Adding a New Domain

### Adding a Domain API (no UI)

1. Create `packages/<domain>-api/` with `package.json`, `tsconfig.json`, `src/api.ts`, `src/types.ts`, `src/index.ts`
2. Add to the `shared` config in every app's `rspack.config.ts`:
   ```js
   "@mfe/<domain>-api": { singleton: true, eager: false, requiredVersion: false }
   ```
3. Add `"@mfe/<domain>-api": "workspace:*"` to each app's `package.json` dependencies
4. Run `pnpm install`

### Adding a New Microfrontend

1. **Create the API package** in `packages/<domain>-api/` (if it doesn't exist)

2. **Create the app** in `apps/<name>/`:
   - `rspack.config.ts` with `ModuleFederationPlugin` (unique name, port, exposes)
   - `src/index.tsx` → `src/bootstrap.tsx` (async boundary)
   - `src/App.tsx` (exposed component)
   - Optional: `src/widgets/` for components other apps can embed

3. **Register in the shell** (`apps/shell/rspack.config.ts`):
   ```js
   remotes: {
     newapp: "newapp@http://localhost:<port>/remoteEntry.js",
   }
   ```

4. **Add type declarations** in `apps/shell/src/declarations.d.ts`:
   ```ts
   declare module "newapp/NewApp" {
     import type { ComponentType } from "react";
     const Component: ComponentType;
     export default Component;
   }
   ```

5. **Add route** in `apps/shell/src/App.tsx`:
   ```tsx
   const NewApp = lazy(() => import("newapp/NewApp"));
   <Route path="/newapp/*" element={<NewApp />} />
   ```

6. **Run `pnpm install`**, then `pnpm dev`

### Exposing a Widget from a Remote

1. Create the widget component in `apps/<name>/src/widgets/MyWidget.tsx`
2. Add to `exposes` in the remote's `rspack.config.ts`:
   ```js
   exposes: {
     "./MyApp": "./src/App.tsx",
     "./MyWidget": "./src/widgets/MyWidget.tsx",
   }
   ```
3. Add type declaration in the shell's `declarations.d.ts`
4. Mount in the shell with `<Suspense>`:
   ```tsx
   const MyWidget = lazy(() => import("newapp/MyWidget"));
   <Suspense fallback={null}><MyWidget /></Suspense>
   ```

The widget reads from its domain's API package for state — it doesn't receive props from the shell.
