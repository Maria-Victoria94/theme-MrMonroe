import "./checkout-link-wc.scss";
import { JuoCheckoutLink } from "./checkout-link-wc";
import "./hide-controller";

if (!customElements.get("juo-checkout-link")) {
  customElements.define("juo-checkout-link", JuoCheckoutLink);
}
