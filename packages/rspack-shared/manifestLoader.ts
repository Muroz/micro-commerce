/**
 * Shape of the JSON served by the manifest project (manifest/prod.json,
 * manifest/staging.json). Pinned per-remote URLs are absolute and must not
 * include a trailing slash; the loader appends `/remoteEntry.js`.
 */
export interface MfeManifest {
  version: string;
  updatedAt: string;
  remotes: Record<string, string>;
}

declare global {
  interface Window {
    __MFE_MANIFEST_URL__?: string;
    __MFE_MANIFEST_PROMISE__?: Promise<Record<string, string>>;
    __MFE_FALLBACK_MANIFEST__?: Record<string, string>;
  }
}

/**
 * Single-flight manifest fetch. All `dynamicRemote()` invocations within a
 * single page load share the same promise — the manifest is fetched at most
 * once per session.
 *
 * Resolution order:
 *   1. `window.__MFE_MANIFEST_URL__` if set and not a `__PLACEHOLDER__`.
 *   2. On fetch failure (network, non-2xx, malformed JSON), falls back to
 *      `window.__MFE_FALLBACK_MANIFEST__` (baked into the shell at build
 *      time via Rspack DefinePlugin) — keeps the app loading during a
 *      manifest outage.
 *   3. If both fail, returns `{}` and `dynamicRemote()` falls back to the
 *      configured localhost dev port.
 */
export function loadManifest(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return Promise.resolve({});
  if (window.__MFE_MANIFEST_PROMISE__) return window.__MFE_MANIFEST_PROMISE__;

  const url = window.__MFE_MANIFEST_URL__;
  const fallback = window.__MFE_FALLBACK_MANIFEST__ || {};

  if (!url || url.startsWith("__")) {
    return (window.__MFE_MANIFEST_PROMISE__ = Promise.resolve(fallback));
  }

  window.__MFE_MANIFEST_PROMISE__ = fetch(url, { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((m: MfeManifest) => m.remotes || fallback)
    .catch((err) => {
      console.warn("[mfe] manifest fetch failed, using fallback", err);
      return fallback;
    });

  return window.__MFE_MANIFEST_PROMISE__;
}
