declare const __MFE_FALLBACK_MANIFEST__: Record<string, string>;

declare global {
  interface Window {
    __MFE_FALLBACK_MANIFEST__?: Record<string, string>;
  }
}

if (typeof window !== "undefined" && !window.__MFE_FALLBACK_MANIFEST__) {
  window.__MFE_FALLBACK_MANIFEST__ = __MFE_FALLBACK_MANIFEST__;
}

export {};
