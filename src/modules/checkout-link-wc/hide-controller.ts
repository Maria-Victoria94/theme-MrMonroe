// Companion behavior for <juo-checkout-link>: hides arbitrary page elements
// while a fixed/selling-plan checkout is available, then restores them when the
// cart goes back to plain products.
//
// Opt-in and config-driven: the button carries a `data-hide-when-active`
// attribute holding a comma-separated CSS selector list. We ride the
// `juo:checkout:ready` event the element already emits (bubbles to document,
// fires synchronously on connect and on every cart change) and toggle a single
// utility class on every match across the whole document — the targets need no
// DOM relationship to the button.
//
// Registered at module load (see index.ts) so the listener is attached before
// the element connects and fires its first event.

const HIDDEN_CLASS = "juo-hidden-by-checkout";

document.addEventListener("juo:checkout:ready", (event) => {
  const link = event.target;
  if (!(link instanceof HTMLElement)) return;

  const selector = link.dataset.hideWhenActive?.trim();
  if (!selector) return;

  const hide = Boolean((event as CustomEvent).detail?.hasSellingPlan);

  let targets: NodeListOf<Element>;
  try {
    targets = document.querySelectorAll(selector);
  } catch (error) {
    // Invalid selector from theme settings — fail loud in the console but
    // don't break the checkout flow.
    console.error(
      `[juo-checkout-link] Invalid data-hide-when-active selector: ${selector}`,
      error
    );
    return;
  }

  targets.forEach((el) => el.classList.toggle(HIDDEN_CLASS, hide));
});
