import { readFileSync } from 'node:fs';

/**
 * SPEC.md's appendix A holds copies of the files in spec/ (the ABNF, the
 * RELAX NG schema, and the Web IDL), each between two comments naming
 * it, so that the specification reads whole on GitHub and on the site.
 * `pnpm grammar:update` refreshes them; a test checks they match.
 */
export const EMBEDDED = [
  { file: 'spec/holoml.abnf', lang: 'abnf' },
  { file: 'spec/holoml.rnc', lang: 'rnc' },
  { file: 'spec/holoml.webidl', lang: 'webidl' },
] as const;

const root = new URL('../../../', import.meta.url);

/** The text a file's block in SPEC.md must have between its comments. */
export function block(file: string, lang: string): string {
  const text = readFileSync(new URL(file, root), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
  return `<!-- ${file} -->\n\`\`\`${lang}\n${text}\n\`\`\`\n<!-- /${file} -->`;
}

/** What SPEC.md holds between a file's comments, or null when the comments are missing. */
export function embedded(spec: string, file: string): string | null {
  const start = spec.indexOf(`<!-- ${file} -->`);
  const endMark = `<!-- /${file} -->`;
  const end = spec.indexOf(endMark, start);
  return start < 0 || end < 0 ? null : spec.slice(start, end + endMark.length);
}

/** SPEC.md with every file's block refreshed. */
export function withEmbedded(spec: string): string {
  let out = spec.replace(/\r\n/g, '\n');
  for (const { file, lang } of EMBEDDED) {
    const now = embedded(out, file);
    if (now === null) throw new Error(`SPEC.md has no place for ${file}`);
    out = out.replace(now, block(file, lang));
  }
  return out;
}
