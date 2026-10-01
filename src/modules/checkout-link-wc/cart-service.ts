import { CartWatcher } from "./cartWatcher";
import { nativeFetch } from "./nativeFetch";
import type { CartState } from "./types";

export class ConcurrentSwapError extends Error {
  constructor() {
    super("Checkout swap already in progress");
    this.name = "ConcurrentSwapError";
  }
}

export class CartService {
  private watcher: CartWatcher;
  private sellingPlansMap = new Map<string, number>();
  private lastItemKeys = "";
  private sectionId: string;
  private fetchPromise: Promise<Map<string, number>> | null = null;
  private fetchFn: typeof window.fetch;
  private _isProcessing = false;
  private _isReverting = false;

  get isProcessing(): boolean {
    return this._isProcessing;
  }

  get isReverting(): boolean {
    return this._isReverting;
  }

  constructor(sectionId = "juo-selling-plans", useNativeFetch = false) {
    this.sectionId = sectionId;
    // The `native-fetch` option routes only the checkout-swap cart writes
    // (cart/clear + cart/add.js) through a pristine fetch from a hidden iframe.
    // Bundle apps like Kaching Bundles monkey-patch window.fetch to intercept
    // those writes and corrupt the swap; reads (/cart.js, the section fetch)
    // are not affected, so they stay on the global fetch. Mirrors the emoni
    // install. Off by default.
    this.fetchFn = useNativeFetch ? nativeFetch() : window.fetch.bind(window);
    this.watcher = new CartWatcher();
  }

  init() {
    this.watcher.init();
  }

  stop() {
    this.watcher.stop();
  }

  storedCart(): CartState {
    return this.watcher.storedCart();
  }

  onCartChange(handler: EventListener) {
    window.addEventListener("cart_changed", handler);
  }

  offCartChange(handler: EventListener) {
    window.removeEventListener("cart_changed", handler);
  }

  cartHasSellingPlan(): boolean {
    return this.watcher
      .storedCart()
      .items.some((item) => item.selling_plan_allocation);
  }

  async fetchSellingPlansMap(): Promise<Map<string, number>> {
    const currentKeys = this.watcher
      .storedCart()
      .items.map((i) => i.key)
      .join(",");

    if (currentKeys === this.lastItemKeys && this.sellingPlansMap.size > 0) {
      return this.sellingPlansMap;
    }
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this.doFetchSellingPlansMap(currentKeys);
    try {
      return await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async doFetchSellingPlansMap(
    currentKeys: string
  ): Promise<Map<string, number>> {
    this.sellingPlansMap.clear();

    const response = await fetch(`/?section_id=${this.sectionId}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch selling plans section: HTTP ${response.status}`
      );
    }

    const el = document.createElement("div");
    el.innerHTML = await response.text();
    const tpl = el.querySelector<HTMLTemplateElement>("template");
    const raw = (
      tpl?.content?.textContent ||
      tpl?.textContent ||
      tpl?.innerHTML ||
      "{}"
    ).trim();
    const parsed = JSON.parse(raw || "{}");
    Object.entries(parsed).forEach(([key, value]) => {
      if (value != null) {
        this.sellingPlansMap.set(key, value as number);
      }
    });

    this.lastItemKeys = currentKeys;
    return this.sellingPlansMap;
  }

  async swapCartForCheckout(checkoutUrl: string): Promise<void> {
    if (this._isProcessing) throw new ConcurrentSwapError();
    this._isProcessing = true;

    const cart = this.watcher.storedCart();
    let sellingPlansMap: Map<string, number>;
    try {
      sellingPlansMap = await this.fetchSellingPlansMap();
    } catch (error) {
      this._isProcessing = false;
      throw error;
    }

    const shouldSwitch = cart.items.some(
      (item) =>
        item.selling_plan_allocation != null &&
        sellingPlansMap.has(String(item.key))
    );

    if (!shouldSwitch) {
      this._isProcessing = false;
      window.location.href = checkoutUrl;
      return;
    }

    const originalItems = cart.items.map((item) => ({
      id: item.variant_id,
      quantity: item.quantity,
      properties: item.properties,
      ...(item.selling_plan_allocation
        ? { selling_plan: item.selling_plan_allocation.selling_plan.id }
        : {}),
    }));

    const toAdd = cart.items.map((item) => {
      const mappedSellingPlan =
        item.selling_plan_allocation != null
          ? sellingPlansMap.get(String(item.key))
          : null;

      return {
        id: item.variant_id,
        quantity: item.quantity,
        properties: {
          ...item.properties,
          ...(item.selling_plan_allocation != null && mappedSellingPlan != null
            ? {
                _selling_plan_id: String(
                  item.selling_plan_allocation.selling_plan.id
                ),
              }
            : {}),
        },
        ...(item.selling_plan_allocation != null
          ? {
              selling_plan:
                mappedSellingPlan != null
                  ? mappedSellingPlan
                  : item.selling_plan_allocation.selling_plan.id,
            }
          : {}),
      };
    });

    try {
      await this.fetchFn(window.Shopify.routes.root + "cart/clear");
      const res = await this.fetchFn(
        window.Shopify.routes.root + "cart/add.js",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attributes: cart.attributes, items: toAdd }),
        }
      );

      if (!res.ok) throw new Error("Failed to add items to cart");

      this.stop();
      this._isProcessing = false;
      window.location.href = checkoutUrl;
    } catch (error) {
      try {
        await this.fetchFn(window.Shopify.routes.root + "cart/clear");
        await this.fetchFn(window.Shopify.routes.root + "cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attributes: cart.attributes,
            items: originalItems,
          }),
        });
      } catch (restoreError) {
        console.error("Failed to restore cart:", restoreError);
      }
      this._isProcessing = false;
      throw error;
    }
  }

  async revertCart(): Promise<void> {
    const cart = await this.watcher.fetchCart();
    if (!cart) return;

    const shouldRevert = cart.items.some(
      (item) =>
        item.properties._selling_plan_id != null &&
        item.properties._selling_plan_id !== ""
    );
    if (!shouldRevert) return;

    const toAdd = cart.items.map((item) => {
      const hasIntent =
        item.properties._selling_plan_id != null &&
        item.properties._selling_plan_id !== "";
      return {
        id: item.variant_id,
        quantity: item.quantity,
        properties: {
          ...item.properties,
          ...(hasIntent ? { _selling_plan_id: "" } : {}),
        },
        ...(hasIntent
          ? { selling_plan: item.properties._selling_plan_id }
          : {}),
      };
    });

    this._isReverting = true;
    try {
      await this.fetchFn(window.Shopify.routes.root + "cart/clear");
      await this.fetchFn(window.Shopify.routes.root + "cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: cart.attributes, items: toAdd }),
      });
      // Sync storedCart to the final reverted state while listeners are
      // still gated by isReverting. Otherwise a queued PerformanceObserver
      // callback from cart/clear (which may not have run yet) can write
      // an empty cart to storedCart AFTER we unblock — causing the button
      // to briefly flash to "idle" before the next event corrects it.
      await this.watcher.emitCartChanges();
    } finally {
      this._isReverting = false;
      // Force one re-evaluation now that revert is done. Intermediate
      // cart_changed events fired during the clear→add window were
      // skipped by listeners (isReverting was true), so they need a
      // fresh signal to read the restored cart and update their UI.
      window.dispatchEvent(
        new CustomEvent("cart_changed", { detail: { added: [], removed: [] } })
      );
    }
  }
}

let instance: CartService | null = null;
let refCount = 0;
let pageshowHandler: ((e: PageTransitionEvent) => void) | null = null;

export function acquireCartService(
  sectionId = "juo-selling-plans",
  useNativeFetch = false
): CartService {
  if (!instance) {
    instance = new CartService(sectionId, useNativeFetch);
    instance.init();
    // Always revert on first load: if the user came back from /checkout
    // (with or without bfcache) the cart may still hold swapped fixed
    // plans. revertCart is a no-op when no _selling_plan_id markers exist.
    instance.revertCart().catch(console.error);
    pageshowHandler = ({ persisted }) => {
      if (persisted) instance?.revertCart().catch(console.error);
    };
    window.addEventListener("pageshow", pageshowHandler);
  }
  refCount++;
  return instance;
}

export function releaseCartService(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount !== 0 || !instance) return;
  // Defer teardown while a swap is mid-flight — the swap holds a reference
  // and will reset isProcessing when it completes. The next release will
  // succeed in tearing down.
  if (instance.isProcessing) return;

  instance.stop();
  if (pageshowHandler) {
    window.removeEventListener("pageshow", pageshowHandler);
  }
  instance = null;
  pageshowHandler = null;
}
