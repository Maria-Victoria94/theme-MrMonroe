import "./index.scss";
import { CartWatcher } from "./cartWatcher";

declare global {
  interface Window {
    Shopify: {
      routes: {
        root: string;
      };
    };
  }
}

(function () {
  const idealButtonSelector = "#juo-go-to-checkout-with-ideal";
  const cartFormSelector = "form[action*='/cart']";

  const myCartWatcher = new CartWatcher();

  const sellingPlansMap = new Map<string, number>();
  let isProcessing = false;
  let lastItemKeys = "";

  async function updateSellingPlansMap() {
    const button = document.querySelector(idealButtonSelector);
    if (!button) {
      return;
    }

    const currentKeys = myCartWatcher
      .storedCart()
      .items.map((i) => i.key)
      .join(",");

    if (currentKeys === lastItemKeys && sellingPlansMap.size > 0) {
      return;
    }
    lastItemKeys = currentKeys;

    button.setAttribute("disabled", "disabled");

    sellingPlansMap.clear();
    const response = await fetch("/?section_id=juo-selling-plans");

    if (response.status !== 200) {
      console.error("Failed to load selling plans");
      return;
    }

    try {
      const el = document.createElement("div");
      el.innerHTML = await response.text();
      const parsed = JSON.parse(
        el.querySelector("template")?.innerHTML ?? "{}"
      );
      Object.entries(parsed).map(([key, value]) => {
        if (value != null) {
          sellingPlansMap.set(key, value as number);
        }
      });
    } catch (error) {
      console.error("Failed to load selling plans");
    }

    if (
      myCartWatcher
        .storedCart()
        .items.filter((item) => item.selling_plan_allocation).length ==
      sellingPlansMap.size
    ) {
      button.removeAttribute("disabled");
    }
  }

  function handleCartChange() {
    const form = document.querySelector(cartFormSelector);
    if (!form) {
      console.warn("No cart form found");
      return;
    }

    const cart = myCartWatcher.storedCart();
    const hasSellingPlan = cart.items.some(
      (item) => item.selling_plan_allocation
    );

    form.classList[hasSellingPlan ? "add" : "remove"]("has-selling-plan");

    if (hasSellingPlan) {
      updateSellingPlansMap();
    }
  }

  async function handleCheckoutLink() {
    myCartWatcher.init();
    document.addEventListener("click", switchCart);
    window.addEventListener("cart_changed", handleCartChange);
    updateSellingPlansMap();
  }

  async function switchCart(e) {
    if (e == null) {
      return;
    }
    const checkoutButton = (e?.target as HTMLElement).matches(
      idealButtonSelector
    )
      ? (e.target as HTMLElement)
      : null;

    if (checkoutButton == null) {
      return;
    }

    if (isProcessing) return;
    isProcessing = true;
    e.target.disabled = true;

    const cart = myCartWatcher.storedCart();
    await updateSellingPlansMap();

    const shouldSwitch = cart.items.some((item) => {
      if (item.selling_plan_allocation != null) {
        return sellingPlansMap.has(String(item.key));
      }
      return false;
    });

    if (!shouldSwitch) {
      window.location.href = "/checkout";
      return;
    }

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
                  : String(item.selling_plan_allocation.selling_plan.id),
            }
          : {}),
      };
    });

    const originalItems = cart.items.map((item) => ({
      id: item.variant_id,
      quantity: item.quantity,
      properties: item.properties,
      ...(item.selling_plan_allocation
        ? { selling_plan: item.selling_plan_allocation.selling_plan.id }
        : {}),
    }));

    try {
      await fetch(window.Shopify.routes.root + "cart/clear");

      const res = await fetch(window.Shopify.routes.root + "cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attributes: cart.attributes,
          items: toAdd,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add items to cart");
      }

      myCartWatcher.stop();
      window.location.href = "/checkout?skip_shop_pay=true";
    } catch (error) {
      console.error(error);
      // Restore original cart
      try {
        await fetch(window.Shopify.routes.root + "cart/clear");
        await fetch(window.Shopify.routes.root + "cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attributes: cart.attributes,
            items: originalItems,
          }),
        });
      } catch (restoreError) {
        console.error("Failed to restore cart:", restoreError);
      }
      isProcessing = false;
      checkoutButton.removeAttribute("disabled");
      myCartWatcher.observeCartChanges();
    }
  }

  async function revertCart() {
    const cart = await myCartWatcher.fetchCart();
    if (!cart) return;
    const shouldSwitch = cart.items.some((item) => {
      return (
        item.properties._selling_plan_id != null &&
        item.properties._selling_plan_id !== ""
      );
    });

    if (!shouldSwitch) {
      return;
    }

    const toAdd = cart.items.map((item) => {
      const hasIntent =
        item.properties._selling_plan_id != null &&
        item.properties._selling_plan_id !== "";

      return {
        id: item.variant_id,
        quantity: item.quantity,
        properties: {
          ...item.properties,
          ...(hasIntent
            ? {
                _selling_plan_id: "",
              }
            : {}),
        },
        ...(hasIntent
          ? {
              selling_plan: item.properties._selling_plan_id,
            }
          : {}),
      };
    });

    await fetch(window.Shopify.routes.root + "cart/clear");

    await fetch(window.Shopify.routes.root + "cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attributes: cart.attributes,
        items: toAdd,
      }),
    });
  }

  function init() {
    if (window.Shopify != null) {
      handleCheckoutLink();
      handleCartChange();
      revertCart();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Revert on every pageshow (initial load + bfcache restore) so the cart
  // is only ever in the swapped "fixed plan" state during the brief window
  // between our button click and the redirect to /checkout. The theme's
  // native checkout button always operates on the original recurring plan.
  // revertCart is a no-op when no _selling_plan_id markers exist.
  window.addEventListener("pageshow", ({ persisted }) => {
    revertCart();
    if (persisted) handleCartChange();
  });
})();
