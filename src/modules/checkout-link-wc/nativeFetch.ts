let cached: typeof window.fetch | null = null;

/**
 * Returns a pristine `fetch` pulled from a hidden same-origin iframe.
 *
 * Apps like Kaching Bundles monkey-patch the top window's `fetch` to intercept
 * cart writes. A fresh iframe gets its own untouched `window.fetch`, so calls
 * made through this reference bypass that interception.
 *
 * The iframe is kept attached for the page lifetime: the bound `fetch` runs in
 * the iframe's global scope, and detaching the iframe tears that scope down,
 * causing "The global scope is shutting down" errors on later calls.
 */
export function nativeFetch(): typeof window.fetch {
  if (cached) return cached;

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.setAttribute("aria-hidden", "true");
  document.documentElement.appendChild(iframe);

  cached = iframe.contentWindow!.fetch.bind(iframe.contentWindow);

  return cached;
}
