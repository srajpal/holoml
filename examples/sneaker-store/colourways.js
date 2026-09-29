// The sneaker store's shoe and its colourways: read by the pages' scripts
// (store.js, shoe.js, and checkout.html) and by tools/prepare.mjs, which
// makes each colourway's pictures and models. `upper` and `trim` are the
// colours prepare.mjs puts on the knit and on the trim; the first three
// are the shoe's own pictures. The prices are made up.

export const SHOE = 'Everyday Runner';

export const COLOURWAYS = [
  { id: 'midnight', name: 'Midnight', price: 120, note: 'Blue knit, navy trim' },
  { id: 'beach', name: 'Beach', price: 120, note: 'Rose knit, mauve trim' },
  { id: 'street', name: 'Street', price: 120, note: 'Charcoal knit, red trim' },
  { id: 'forest', name: 'Forest', price: 125, note: 'Green knit, pine trim', upper: '#3f7d52', trim: '#1e4630' },
  { id: 'sunset', name: 'Sunset', price: 125, note: 'Orange knit, red trim', upper: '#ea7b35', trim: '#b3312b' },
  { id: 'lemon', name: 'Lemon', price: 125, note: 'Yellow knit, charcoal trim', upper: '#e9cf45', trim: '#34363a' },
  { id: 'violet', name: 'Violet', price: 130, note: 'Violet knit, plum trim', upper: '#7b5fc6', trim: '#3d2b6b' },
  { id: 'sky', name: 'Sky', price: 125, note: 'Pale blue knit, steel trim', upper: '#9ccbe9', trim: '#4f7fa8' },
  { id: 'cloud', name: 'Cloud', price: 130, note: 'White knit, grey trim', upper: '#e7e6e2', trim: '#9b9a96' },
  { id: 'ember', name: 'Ember', price: 135, note: 'Red knit, black trim', upper: '#b93431', trim: '#1d1d1f' },
];

/** EU sizes, as the shoe page offers them. */
export const SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'];

/** The cart, kept in the tab's session storage across the store's pages: a list of { colour, size }. */
export const CART_KEY = 'sneaker-store-cart';

export function readCart() {
  try {
    const items = JSON.parse(sessionStorage.getItem(CART_KEY) ?? '[]');
    return Array.isArray(items) ? items.filter((i) => COLOURWAYS.some((c) => c.id === i?.colour) && SIZES.includes(i?.size)) : [];
  } catch {
    // Storage may be switched off: the store works without a cart.
    return [];
  }
}

export function writeCart(items) {
  try {
    sessionStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // As above.
  }
}

/** "2 pairs · $245", or "empty". */
export function cartSummary(items) {
  if (items.length === 0) return 'empty';
  const total = items.reduce((sum, i) => sum + (COLOURWAYS.find((c) => c.id === i.colour)?.price ?? 0), 0);
  return `${items.length} ${items.length === 1 ? 'pair' : 'pairs'} · $${total}`;
}
