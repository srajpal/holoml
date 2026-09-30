// The licence check of the aquarium's tools (download.mjs and
// prepare.mjs). Every model is CC BY 4.0 or CC0 (owner, prompt 122, Q1 a);
// none is "non-commercial", "no derivatives", or "share alike". A file
// from Sketchfab carries its own stamp (asset.extras.license, as
// "CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)"), written when
// it was downloaded there; a record kept elsewhere, such as Objaverse's,
// can say otherwise, and then the file's own stamp is the one to believe.
// So the tools stop when a file's stamp and its credit in fish.mjs
// disagree, or when either names a condition the examples do not take.

/** The licences a model may have, as fish.mjs writes them, and where each is set out. */
export const LICENCES = {
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
};

const REFUSED = { nc: 'non-commercial', nd: 'no derivatives', sa: 'share alike' };

/** A licence's name as its words, so that "CC-BY-4.0 (http://…)" and "CC BY 4.0" read alike. */
const words = (name) => name.replace(/\(.*\)/, '').toLowerCase().match(/[a-z]+|\d+(?:\.\d+)?/g) ?? [];

/** The conditions a licence's name or address has that the examples do not take. */
const refused = (text) => Object.keys(REFUSED).filter((k) => text.toLowerCase().split(/[^a-z0-9]+/).includes(k));

/** The licence stamp a .glb file's bytes carry (asset.extras.license), or null when it has none. */
export function stampOf(bytes) {
  if (bytes.toString('latin1', 0, 4) !== 'glTF') throw new Error('not a binary glTF file');
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  const stamp = json.asset?.extras?.license;
  return typeof stamp === 'string' && stamp.trim() ? stamp.trim() : null;
}

/**
 * What is wrong with a model's licence, as a message, or null when nothing
 * is: `credit` is the licence fish.mjs gives it, `stamp` the file's own
 * (null when the file has none, and then the credit stands alone).
 */
export function licenceProblem(id, credit, stamp) {
  const rule = 'Every model must be CC BY 4.0 or CC0: choose another model.';
  if (!Object.hasOwn(LICENCES, credit)) return `${id}: tools/fish.mjs credits it as "${credit}", which is not ${Object.keys(LICENCES).join(' or ')}. ${rule}`;
  if (stamp === null) return null;
  const conditions = refused(stamp);
  if (conditions.length) return `${id}: the file's own licence stamp is "${stamp}" (${conditions.map((k) => REFUSED[k]).join(', ')}), but tools/fish.mjs credits it as ${credit}. ${rule}`;
  if (words(stamp).join(' ') !== words(credit).join(' ')) return `${id}: the file's own licence stamp is "${stamp}", but tools/fish.mjs credits it as ${credit}. Correct the credit if the stamp is CC BY 4.0 or CC0; otherwise choose another model.`;
  return null;
}

/** Stops (throws) when a model's file and its credit disagree about its licence, or either is not CC BY 4.0 or CC0. */
export function checkLicence(f, bytes) {
  const problem = licenceProblem(f.id, f.credit.licence, stampOf(bytes));
  if (problem) throw new Error(problem);
}
