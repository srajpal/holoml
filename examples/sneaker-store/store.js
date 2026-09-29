// The sneaker store's script (HoloML 0.2 scene API, SPEC.md section 10):
// the cart on the screen, as the shoe pages leave it in this tab's session
// storage. The shelves load by area without any script.
import { cartSummary, readCart } from './colourways.js';

const cart = holoml.find('cart');
const show = () => (cart.text = `Cart: ${cartSummary(readCart())}`);
show();
// Back from a shoe page or the checkout page: the cart as it is now.
window.addEventListener('pageshow', show);
