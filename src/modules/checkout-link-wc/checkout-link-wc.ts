import {
  acquireCartService,
  releaseCartService,
  ConcurrentSwapError,
  type CartService,
} from "./cart-service";

type State = "idle" | "loading" | "ready" | "processing" | "success" | "error";

export class JuoCheckoutLink extends HTMLElement {
  private cartService: CartService | null = null;
  private cartChangeHandler!: EventListener;
  private _state: State = "idle";

  static get observedAttributes() {
    return ["disabled"];
  }

  connectedCallback() {
    if (!window.Shopify) return;

    if (!this.textContent?.trim()) {
      this.textContent = "Checkout with iDEAL";
    }
    if (!this.hasAttribute("role")) this.setAttribute("role", "button");

    this.setState("loading");

    const sectionId =
      this.getAttribute("selling-plans-section") ?? "juo-selling-plans";
    const useNativeFetch = this.hasAttribute("native-fetch");
    this.cartService = acquireCartService(sectionId, useNativeFetch);

    this.cartChangeHandler = () => this.onCartChange();
    this.cartService.onCartChange(this.cartChangeHandler);

    // Resolve initial visibility synchronously from the cart in localStorage
    // (populated by previous visits / cart changes). Avoids gating the first
    // paint on /cart.js or /?section_id=… round trips. cart_changed events
    // will refine the state when the live fetches resolve.
    this.onCartChange();

    this.addEventListener("click", this.handleActivate);
    this.addEventListener("keydown", this.handleKeydown);

    this.cartService
      .fetchSellingPlansMap()
      .then(() => {
        if (!this.isConnected) return;
        this.onCartChange();
      })
      .catch(console.error);
  }

  disconnectedCallback() {
    this.cartService?.offCartChange(this.cartChangeHandler);
    this.cartService = null;
    releaseCartService();
    this.removeEventListener("click", this.handleActivate);
    this.removeEventListener("keydown", this.handleKeydown);
  }

  attributeChangedCallback(name: string) {
    if (!this.isConnected) return;
    if (name === "disabled") this.syncDisabled();
  }

  private setState(state: State) {
    this._state = state;
    this.dataset.state = state;
    this.syncDisabled();
  }

  private syncDisabled() {
    const disabled =
      this.hasAttribute("disabled") ||
      ["loading", "processing", "success"].includes(this._state);
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    this.setAttribute("tabindex", disabled ? "-1" : "0");
  }

  private onCartChange() {
    if (
      this._state === "processing" ||
      this._state === "success" ||
      this._state === "error"
    ) {
      return;
    }
    if (this.cartService?.isReverting) return;
    const hasSellingPlan = this.cartService?.cartHasSellingPlan() ?? false;
    this.setState(hasSellingPlan ? "ready" : "idle");
    this.dispatchEvent(
      new CustomEvent("juo:checkout:ready", {
        bubbles: true,
        detail: { hasSellingPlan },
      })
    );
  }

  private handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.handleActivate(e);
    }
  };

  private handleActivate = async (e: Event) => {
    e.preventDefault();
    if (this._state !== "ready") return;
    if (this.getAttribute("aria-disabled") === "true") return;

    const checkoutUrl =
      this.getAttribute("checkout-url") ?? "/checkout?skip_shop_pay=true";

    this.setState("processing");
    this.dispatchEvent(
      new CustomEvent("juo:checkout:start", {
        bubbles: true,
        detail: { cart: this.cartService?.storedCart() },
      })
    );

    try {
      await this.cartService?.swapCartForCheckout(checkoutUrl);
      this.setState("success");
      this.dispatchEvent(
        new CustomEvent("juo:checkout:success", {
          bubbles: true,
          detail: { url: checkoutUrl },
        })
      );
    } catch (error) {
      if (error instanceof ConcurrentSwapError) {
        this.setState("ready");
        return;
      }
      console.error(error);
      this.setState("error");
      this.dispatchEvent(
        new CustomEvent("juo:checkout:error", {
          bubbles: true,
          detail: { error, restored: true },
        })
      );
      setTimeout(() => {
        if (this._state === "error") this.setState("ready");
      }, 3000);
    }
  };
}
