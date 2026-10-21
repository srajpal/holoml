// The HoloML playground (holoml #58, the promotion plan's step 16): the
// page's text on the left, checked as you type by HoloML's own parser and
// checker (written beside this file as plain modules by site/build.mjs),
// and the scene on the right, drawn by HyperSpace 3D's viewer on the same
// site. The viewer is framed with ?from=parent and given the text by a
// message (the browser repository's site/viewer/host.js): only to this
// site's own origin, with a base address on it, so the page's models and
// scripts come from the example's folder as on the example itself. The
// presets are fetched from this site; nothing is sent anywhere, and the
// text is kept only in this tab's session storage.

import { parse } from './holoml/parser.js';
import { check } from './holoml/schema.js';

/** How long after the last key the page is checked, and then drawn (milliseconds). */
const CHECK_AFTER = 250;
const DRAW_AFTER = 1000;
/** The tab's own copy of the text, so that a reload keeps it. */
const KEPT = 'holoml-playground';
const INDENT = '  ';

const text = document.getElementById('pg-text');
const lines = document.getElementById('pg-lines');
const preset = document.getElementById('pg-preset');
const count = document.getElementById('pg-count');
const list = document.getElementById('pg-problems');
const live = document.getElementById('pg-live');
const run = document.getElementById('pg-run');
const note = document.getElementById('pg-note');
const place = document.getElementById('pg-frame');
const scene = place.closest('.pg-scene');
const VIEWER = new URL(place.dataset.viewer, location.href).href;

/** The page's address, as the base of what it names: the starter beside the showroom's models, an example in its own folder. */
const baseOf = (name) => new URL(name === 'first' ? '../showroom/index.holoml' : `../${name}/index.holoml`, location.href).href;
const sourceOf = (name) => new URL(name === 'first' ? 'first.holoml' : `../${name}/index.holoml`, location.href).href;

let current = 'first';
/** The text as it was given (a preset just loaded): changed when it differs. */
let given = '';
let checkTimer = 0;
let drawTimer = 0;
/** What the frame is to draw when it asks; null when nothing waits. */
let waiting = null;
let frame = null;
/** Whether the scene drawn last had problems (Run and Ctrl+Enter draw a page that has them). */
let drawnWithProblems = false;
const webgl2 = (() => {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    return false;
  }
})();

function keep() {
  try {
    sessionStorage.setItem(KEPT, JSON.stringify({ preset: current, text: text.value }));
  } catch {
    // A tab that keeps nothing still works; a reload starts again.
  }
}

function kept() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEPT) ?? 'null');
    return value && typeof value.text === 'string' && typeof value.preset === 'string' ? value : null;
  } catch {
    return null;
  }
}

/** The numbers beside the text, with the lines that have a problem marked. */
function number(marked = new Set()) {
  const n = text.value.split('\n').length;
  lines.replaceChildren(
    ...Array.from({ length: n }, (_, i) => {
      const line = document.createElement('span');
      line.textContent = `${i + 1}\n`;
      if (marked.has(i + 1)) line.className = 'pg-marked';
      return line;
    }),
  );
  lines.scrollTop = text.scrollTop;
}

/** The page's problems: the one syntax mistake, or each of the checker's, in document order. */
function problemsOf(source) {
  let doc;
  try {
    doc = parse(source);
  } catch (e) {
    if (e && e.position) return { syntax: true, problems: [{ line: e.position.line, column: e.position.column, code: e.code, message: e.detail ?? e.message }] };
    return { syntax: true, problems: [{ line: 1, column: 1, code: 'error', message: String(e?.message ?? e) }] };
  }
  return { syntax: false, problems: check(doc) };
}

/** Puts the caret at a line and column of the text (both from 1; columns in UTF-16 units, as the checker counts them). */
function caretTo(line, column) {
  const all = text.value.split('\n');
  let at = 0;
  for (let i = 0; i < line - 1 && i < all.length; i++) at += all[i].length + 1;
  at += Math.max(0, Math.min(column - 1, (all[line - 1] ?? '').length));
  text.focus();
  text.setSelectionRange(at, at);
  // Bring the line into view: a line's height times the lines above it.
  const height = parseFloat(getComputedStyle(text).lineHeight) || 20;
  const top = (line - 1) * height;
  if (top < text.scrollTop || top > text.scrollTop + text.clientHeight - height) text.scrollTop = Math.max(0, top - text.clientHeight / 2);
}

let last = { syntax: false, problems: [] };

function checkNow() {
  last = problemsOf(text.value);
  const { problems, syntax } = last;
  list.replaceChildren(
    ...problems.map((p) => {
      const item = document.createElement('li');
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'pg-problem';
      go.dataset.line = String(p.line);
      go.dataset.column = String(p.column);
      const where = document.createElement('span');
      where.className = 'pg-where';
      where.textContent = `Line ${p.line}, column ${p.column}`;
      const code = document.createElement('code');
      code.textContent = p.code;
      go.append(where, `: ${p.message} `, code);
      go.addEventListener('click', () => caretTo(p.line, p.column));
      item.append(go);
      return item;
    }),
  );
  count.textContent = problems.length === 0 ? 'No problems.' : syntax ? 'A mistake in the syntax: the page cannot be read past it.' : problems.length === 1 ? '1 problem.' : `${problems.length} problems.`;
  count.classList.toggle('pg-bad', problems.length > 0);
  number(new Set(problems.map((p) => p.line)));
  scene.classList.toggle('pg-stale', problems.length > 0 && frame !== null);
  if (problems.length > 0 && frame !== null) say(drawnWithProblems ? 'The page has a problem: the scene shows an earlier version.' : 'The page has a problem: the scene shows the last version without one.');
  else if (note.dataset.kind === 'stale') say('');
  return problems.length;
}

/** A line over the scene; kind 'stale' is the one that goes when the problems do. */
function say(message, kind = 'stale') {
  note.textContent = message;
  note.hidden = message === '';
  note.dataset.kind = message === '' ? '' : kind;
}

/** Draws the page: a frame of the viewer (again, if there is one), given the text when it asks. */
function draw() {
  clearTimeout(drawTimer);
  // Without WebGL 2 nothing is drawn, and the note keeps saying why; the problems are in their list.
  if (!webgl2) return;
  if (last.syntax) {
    say('The page has a mistake in its syntax, so it cannot be drawn: see Problems.');
    return;
  }
  drawnWithProblems = last.problems.length > 0;
  waiting ={ holomlPlayground: 1, text: text.value, base: baseOf(current) };
  scene.classList.remove('pg-stale');
  say('');
  if (frame === null) {
    frame = document.createElement('iframe');
    frame.title = "The page, drawn by HyperSpace 3D's viewer";
    frame.src = VIEWER;
    place.replaceChildren(frame);
  } else {
    // Loaded again in place, so the frame's history does not grow with each draw.
    frame.contentWindow.location.replace(VIEWER);
  }
}

addEventListener('message', (e) => {
  if (frame === null || e.source !== frame.contentWindow || e.origin !== location.origin) return;
  const data = e.data;
  if (typeof data !== 'object' || data === null || typeof data.holomlViewer !== 'string') return;
  if (data.holomlViewer === 'ready' && waiting) {
    frame.contentWindow.postMessage(waiting, location.origin);
    waiting = null;
  } else if (data.holomlViewer === 'refused') {
    say(`The viewer did not show the page: ${typeof data.detail === 'string' ? data.detail : 'it was refused'}.`, 'refused');
  }
});

function edited() {
  keep();
  number();
  clearTimeout(checkTimer);
  clearTimeout(drawTimer);
  checkTimer = setTimeout(() => {
    if (checkNow() === 0 && live.checked) drawTimer = setTimeout(draw, DRAW_AFTER - CHECK_AFTER);
  }, CHECK_AFTER);
}

/** Indents or outdents the lines the selection touches. */
function indent(out) {
  const { selectionStart: start, selectionEnd: end, value } = text;
  // lastIndexOf from -1 still looks at the first character: a caret at the very start is on the first line.
  const from = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
  const toEnd = value.indexOf('\n', end > start && value[end - 1] === '\n' ? end - 1 : end);
  const to = toEnd < 0 ? value.length : toEnd;
  const block = value.slice(from, to).split('\n');
  const changed = block.map((l) => (out ? l.replace(new RegExp(`^ {1,${INDENT.length}}`), '') : INDENT + l));
  const result = changed.join('\n');
  text.setRangeText(result, from, to, 'preserve');
  const first = changed[0].length - block[0].length;
  text.setSelectionRange(Math.max(from, start + first), Math.max(from, end + (result.length - (to - from))));
  edited();
}

text.addEventListener('input', edited);
text.addEventListener('scroll', () => {
  lines.scrollTop = text.scrollTop;
});
text.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.altKey && (e.key === ']' || e.key === '[')) {
    e.preventDefault();
    indent(e.key === '[');
  } else if (mod && e.key === 'Enter') {
    e.preventDefault();
    checkNow();
    draw();
  }
});
run.addEventListener('click', () => {
  checkNow();
  draw();
});
live.addEventListener('change', () => {
  if (!live.checked) clearTimeout(drawTimer);
  else if (last.problems.length === 0) draw();
});

/** Loads a preset from this site into the text; draws it. */
async function load(name) {
  const asked = name;
  // The text as it was when the page was asked for: what is typed while it loads is not replaced without asking.
  const before = text.value;
  count.textContent = 'Loading the page…';
  let body;
  try {
    const response = await fetch(sourceOf(name), { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`it answered ${response.status}`);
    body = await response.text();
  } catch (e) {
    count.textContent = `The page could not be loaded: ${e?.message ?? e}.`;
    // The menu names the page the text is from.
    if (preset.value === asked) preset.value = current;
    return;
  }
  if (preset.value !== asked) return; // Another was chosen meanwhile.
  if (text.value !== before && !confirm('Replace your changes with this page?')) {
    preset.value = current;
    checkNow();
    return;
  }
  current = name;
  text.value = given = body;
  text.scrollTop = 0;
  keep();
  checkNow();
  draw();
}

preset.addEventListener('change', () => {
  const name = preset.value;
  if (text.value !== given && !confirm('Replace your changes with this page?')) {
    preset.value = current;
    return;
  }
  void load(name);
});

if (!webgl2) {
  live.disabled = true;
  run.disabled = true;
  say('This browser cannot draw 3D scenes (it has no WebGL 2), so the scene is not shown here. The problems still work.', 'webgl');
}

// The page to start from: one asked for in the address (?preset=harbour-loft), the tab's own text, or the first page.
{
  const asked = new URLSearchParams(location.search).get('preset');
  const names = [...preset.options].map((o) => o.value);
  const saved = kept();
  if (asked && names.includes(asked)) {
    preset.value = asked;
    void load(asked);
  } else if (saved && names.includes(saved.preset)) {
    current = preset.value = saved.preset;
    text.value = saved.text;
    // The preset as it was given is not known again: a later choice asks before replacing this text.
    given = '';
    checkNow();
    if (last.problems.length === 0) draw();
  } else {
    preset.value = 'first';
    void load('first');
  }
}
