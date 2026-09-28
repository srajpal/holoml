// The sofa studio's script (HoloML 0.2 scene API, SPEC.md section 10):
// the price follows the fabric and the wood, the Light choice switches
// the room between day and evening, and the choices are kept for the
// cart page in this tab's session storage (there is no shop behind it).

const SOFA = 'Linden two-seat sofa';
const BASE = 1290;
const FABRICS = {
  stone: { name: 'Stone weave', price: 0 },
  linen: { name: 'Blue linen', price: 90 },
  velvet: { name: 'Red velvet', price: 240 },
  check: { name: 'Wool check', price: 310 },
  leather: { name: 'Brown leather', price: 560 },
};
const WOODS = {
  walnut: { name: 'Walnut', price: 0 },
  oak: { name: 'Oak', price: 60 },
  ebony: { name: 'Ebony', price: 120 },
};
const LIGHTS = {
  day: { fill: 0.3, sun: 2, sunColor: '#fff3e2', lamp: 0, glow: 0, background: '#e9e4dc' },
  evening: { fill: 0.07, sun: 0.2, sunColor: '#ff9f6b', lamp: 2.2, glow: 0.35, background: '#262a36' },
};
const KEY = 'sofa-studio';

const fabric = holoml.find('fabric');
const wood = holoml.find('wood');
const time = holoml.find('time');
const price = holoml.find('price');

/** The price and the choices, on the screen and for the cart page. */
function showPrice() {
  const f = FABRICS[fabric.value];
  const w = WOODS[wood.value];
  const total = BASE + f.price + w.price;
  price.text = `${SOFA}\n${f.name} · ${w.name}\n$${total.toLocaleString('en-US')}`;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ sofa: SOFA, fabric: f.name, wood: w.name, price: total, choices: { fabric: fabric.value, wood: wood.value } }));
  } catch {
    // Storage may be switched off; the page works without it.
  }
}

/** Day or evening: the fill and the window's sun dim, the lamp comes on, and the room behind goes dark. */
function showLight(which) {
  const l = LIGHTS[which];
  holoml.find('fill').intensity = l.fill;
  holoml.find('window').intensity = l.sun;
  holoml.find('window').color = l.sunColor;
  holoml.find('lamp-light').intensity = l.lamp;
  holoml.find('lamp-glow').intensity = l.glow;
  holoml.background = l.background;
  price.color = which === 'evening' ? '#f2efe8' : '#1d2330';
}

holoml.on('change', (e) => {
  if (e.thing === time) showLight(e.value);
  else showPrice();
});

// Back from the cart page: the choices made before (setting a value picks it without a change event).
try {
  const kept = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
  if (kept?.choices?.fabric in FABRICS) fabric.value = kept.choices.fabric;
  if (kept?.choices?.wood in WOODS) wood.value = kept.choices.wood;
} catch {
  // Nothing kept, or storage switched off.
}
showPrice();
