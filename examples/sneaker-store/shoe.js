// The shoe page's script (HoloML 0.2 scene API, SPEC.md section 10): it
// picks the colour the store's link asked for (?colour=<id>), shows the
// price for the chosen colour, and puts the shoe in the cart (in this
// tab's session storage; there is no shop behind it) when "Add to cart"
// is clicked or pressed. The colour choice changes the shoe by itself.
import { COLOURWAYS, SHOE, cartSummary, readCart, writeCart } from './colourways.js';

const colour = holoml.find('colour');
const size = holoml.find('size');
const price = holoml.find('price');
const cart = holoml.find('cart');

const asked = new URLSearchParams(location.search).get('colour');
if (asked && colour.options.includes(asked)) colour.value = asked;

function show() {
  const c = COLOURWAYS.find((x) => x.id === colour.value) ?? COLOURWAYS[0];
  price.text = `${SHOE}\n${c.name}\n$${c.price}`;
  cart.text = `Cart: ${cartSummary(readCart())}`;
}

holoml.on('change', (e) => {
  if (e.thing?.id === 'colour') show();
});
// "Add to cart" is a click action's trigger: its chime plays, and scripts hear the click (from the mouse or the keyboard).
holoml.on('click', (e) => {
  // The first button only, as the chime: a right-click adds nothing.
  if (e.button !== 'left' || e.thing?.id !== 'add') return;
  writeCart([...readCart(), { colour: colour.value, size: size.value }]);
  show();
});
show();
// Back from the checkout page: the cart as it is now.
window.addEventListener('pageshow', show);
