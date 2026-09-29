// Harbour Loft's script (HoloML 0.2 scene API, SPEC.md section 10): the
// Light choice turns the flat, or the roof terrace, from day to evening
// and back, and keeps the choice for the tour's other pages in this tab's
// session storage. Everything else (the doors, the lamps, the places, the
// floor plan) is in the markup and needs no script.

const KEY = 'harbour-loft-light';
const time = holoml.find('time');
const fill = holoml.find('fill');
const sun = holoml.find('sun');

// By day, the light the page itself gives (the fill also sets how bright
// the sky and the harbour's light are: full from 0.6). In the evening
// they dim, the sun is gone, and the lamps are the viewer's to switch on.
const LIGHTS = {
  day: { fill: fill.intensity, sun: sun.intensity, background: holoml.background },
  evening: { fill: 0.07, sun: 0, background: '#141821' },
};

function show(which) {
  const l = LIGHTS[which];
  fill.intensity = l.fill;
  sun.intensity = l.sun;
  holoml.background = l.background;
}

holoml.on('change', (e) => {
  if (e.thing !== time) return;
  show(e.value);
  try {
    sessionStorage.setItem(KEY, e.value);
  } catch {
    // Storage may be switched off; the page works without it.
  }
});

// Coming from another page of the tour: the light chosen there (setting a value picks it without a change event).
try {
  const kept = sessionStorage.getItem(KEY);
  if (kept && kept in LIGHTS && kept !== time.value) {
    time.value = kept;
    show(kept);
  }
} catch {
  // Nothing kept, or storage switched off.
}
