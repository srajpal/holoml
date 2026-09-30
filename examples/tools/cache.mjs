// What the example sites' tools share about their downloads (each
// example's tools/cache/, which is not committed) and about the folders
// they make afresh:
//
// - downloads are checked against a SHA-256 recorded for each file
//   (checksums.json beside the tool), so that a source that changes a
//   file cannot change the site unnoticed, and every request gives up
//   after a while instead of waiting for ever;
// - a tool that needs the cache says so before it touches anything;
// - a folder made afresh (an example's models/) is made in a folder of
//   its own and put in place only when all of it is made, so a run that
//   fails leaves the committed files as they were.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

export const HEADERS = { 'User-Agent': 'HoloML examples (https://github.com/srajpal/holoml)' };
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** A file's bytes from an address; gives up after `ms`. */
export async function fetchBytes(url, ms = 300_000) {
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

/** What an address answers, read as JSON; gives up after `ms`. */
export async function fetchJson(url, ms = 60_000) {
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

/** The checksums recorded in a file (each file's path in the cache, with forward slashes, to its SHA-256); none if the file is not there. */
export function readSums(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

/** Writes the checksums, in the order of their paths, so that the file changes only where a checksum does. */
export function writeSums(file, sums) {
  const sorted = Object.fromEntries(Object.keys(sums).sort().map((k) => [k, sums[k]]));
  writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

/**
 * A function that saves a download into `cache`, checked against the
 * checksum recorded for it in `sums`: save(url, file).
 *
 * - A file that is there with its recorded checksum is left alone, and
 *   nothing is fetched.
 * - A file that is missing, or is not the one recorded, is fetched, and
 *   saved only if it has the recorded checksum; otherwise the tool stops.
 * - A file with no recorded checksum stops the tool, unless `record` is
 *   set (the tool's --record): then its checksum is added to `sums`, for
 *   a person to look at the file and commit.
 */
export function keeper({ cache, sums, record = false, fetch: get = fetchBytes, log = console.log }) {
  return async function save(url, file) {
    const name = relative(cache, file).split(sep).join('/');
    const want = sums[name];
    if (want === undefined && !record) {
      throw new Error(`${name}: no checksum is recorded for it. If it belongs here, run the tool again with --record, look at the file, and commit its checksum; nothing was fetched`);
    }
    if (existsSync(file)) {
      const have = sha256(readFileSync(file));
      if (have === want) return;
      if (want === undefined) {
        sums[name] = have;
        return;
      }
    }
    const bytes = await get(url);
    const got = sha256(bytes);
    if (want !== undefined && got !== want) {
      throw new Error(`${url}: not the file expected for ${name} (its checksum is ${got}; ${want} is recorded). Its source has changed it; nothing was saved`);
    }
    sums[name] = got;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    log(`saved ${name}`);
  };
}

/** What a tool needs of its cache and does not find, as a message; null when all of `names` are there. */
export function cacheProblem(cache, names, download) {
  const missing = names.filter((n) => !existsSync(join(cache, n)));
  if (missing.length === 0) return null;
  return `${cache} has no ${missing.join(', ')}: run ${download} first. Nothing was changed.`;
}

/** An empty folder in the cache to make `name` in (an example's models/), until putInPlace. */
export function makingFolder(cache, name) {
  const dir = join(cache, 'making', name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Puts a folder that was made whole in the place of the old one. */
export function putInPlace(made, folder) {
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(dirname(folder), { recursive: true });
  try {
    renameSync(made, folder);
  } catch {
    // Another disk, or a folder something still holds open: copied instead.
    cpSync(made, folder, { recursive: true });
    rmSync(made, { recursive: true, force: true });
  }
}
