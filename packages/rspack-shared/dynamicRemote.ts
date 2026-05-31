/** Default ports for local dev servers, keyed by remote app name. */
const devPorts: Record<string, number> = {
  products: 3001,
  cart: 3002,
  checkout: 3003,
};

/**
 * Generates a Module Federation dynamic remote string for the given scope.
 *
 * Returns a `"promise new Promise(...)"` expression that Rspack evaluates at
 * runtime. All `dynamicRemote()` calls share a single in-flight manifest
 * fetch via the `window.__MFE_MANIFEST_PROMISE__` cache (see `manifestLoader.ts`).
 *
 * Resolution order at runtime:
 *   1. `manifest.remotes[scope]` from `window.__MFE_MANIFEST_URL__` (fetched once).
 *   2. `window.__MFE_FALLBACK_MANIFEST__[scope]` (baked into shell at build time).
 *   3. `<page-protocol>//<page-hostname>:<devPorts[scope]>` for local development —
 *      uses the page's own hostname so the same dev setup works from `localhost`,
 *      a LAN IP, or a tunneled hostname without extra config.
 *
 * The expression is inlined into the bundle as a string — the runtime body
 * cannot reference imported symbols directly, only `window.*`.
 *
 * @param scope - The remote name (must match a key in {@link devPorts} and a
 *   `name` in the remote's `ModuleFederationPlugin` config).
 * @returns A `promise <expr>` string for Module Federation `remotes` config.
 * @throws If `scope` is not found in {@link devPorts}.
 */
export function dynamicRemote(scope: string): string {
  const port = devPorts[scope];
  if (!port) {
    throw new Error(
      `Unknown remote scope: "${scope}". Add it to devPorts in packages/rspack-shared/dynamicRemote.ts`,
    );
  }

  return `promise (window.__MFE_MANIFEST_PROMISE__ || (window.__MFE_MANIFEST_PROMISE__ = (function(){
    var url = window.__MFE_MANIFEST_URL__;
    var fb = window.__MFE_FALLBACK_MANIFEST__ || {};
    if (!url || url.indexOf("__") === 0) return Promise.resolve(fb);
    return fetch(url, { cache: "no-cache" })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function(m){ return m.remotes || fb; })
      .catch(function(e){ console.warn("[mfe] manifest fetch failed, using fallback", e); return fb; });
  })())).then(function(remotes){
    var base = remotes["${scope}"] || (window.location.protocol + "//" + window.location.hostname + ":${port}");
    return new Promise(function(resolve, reject){
      var script = document.createElement("script");
      script.src = base + "/remoteEntry.js";
      script.onload = function(){
        resolve({
          get: function(request){ return window["${scope}"].get(request); },
          init: function(arg){ try { return window["${scope}"].init(arg); } catch(e) { console.log("remote ${scope} already initialized"); } }
        });
      };
      script.onerror = function(){ reject(new Error("Failed to load remote: ${scope} from " + script.src)); };
      document.head.appendChild(script);
    });
  })`;
}
