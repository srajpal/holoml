/**
 * HL1 (HyperSpace 3D milestone 25, Q5 a; owner, prompt 170): the RELAX NG
 * schema (spec/holoml.rnc) checked by a real validator, Jing, the
 * reference one (tools/jing/, with its SHA-256). The schema is valid
 * RELAX NG; every valid conformance sample, written as XML, is valid by
 * it; and the problem samples whose mistakes a grammar can express are
 * not. What a grammar cannot say (the version a page declares, ids and
 * references, how many of an element, attributes that need each other)
 * is the checker's alone, and those samples are left out here.
 *
 * Jing needs Java. Without it the checks are skipped and say so; on
 * GitHub's machines (which have it) a skip is a failure.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { parse, type HoloNode } from '@holoml/parser';
import { samples } from './conformance.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const JAR = join(ROOT, 'tools/jing/jing-20241231.jar');
const JAR_SHA256 = 'ea5e9026244d977e607d8b52212d6871498ece51939f9c49d0e7a77aad91133a';
const SCHEMA = join(ROOT, 'spec/holoml.rnc');

const java = spawnSync('java', ['-version'], { encoding: 'utf8' }).status === 0;
if (!java && process.env['CI']) throw new Error('Java is needed for the RELAX NG checks (Jing), and the automatic builds have it.');

/** Runs Jing on the schema and any documents; its exit status and what it said. */
function jing(...files: string[]): { status: number | null; out: string } {
  const r = spawnSync('java', ['-jar', JAR, '-c', SCHEMA, ...files], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}`.trim() };
}

const escape = (s: string, attribute: boolean) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, attribute ? '&quot;' : '"');

/** A parsed document as XML: what the schema describes (a flag, written alone, is the empty string). */
function toXml(node: HoloNode): string {
  if (node.type === 'text') return escape(node.value, false);
  const attrs = node.attributes.map((a) => ` ${a.name}="${escape(a.value ?? '', true)}"`).join('');
  return `<${node.name}${attrs}>${node.children.map(toXml).join('')}</${node.name}>`;
}

/** The problem samples whose every mistake is one the schema expresses. */
const GRAMMAR_CATCHES = [
  'unknown-element',
  'unknown-attribute',
  'missing-attribute',
  'child-not-allowed',
  'text-not-allowed',
  'inline-script',
  'hud-in-group',
  'wrong-root',
  'missing-child',
  'unsupported-version',
  'version-not-exact',
  'bad-numbers',
  'bad-times',
  'identifier-spaces',
  'other-spaces',
  'empty-values',
  'address-characters',
  'bad-03-attributes',
];

describe.skipIf(!java)('HL1: the RELAX NG schema, checked by Jing (Q5)', () => {
  const work = mkdtempSync(join(tmpdir(), 'holoml-jing-'));
  afterAll(() => rmSync(work, { recursive: true, force: true }));
  const all = samples();
  const write = (group: string, name: string, text: string) => {
    const file = join(work, `${group}-${name}.xml`);
    writeFileSync(file, `<?xml version="1.0" encoding="UTF-8"?>\n${toXml(parse(text).root)}\n`);
    return file;
  };

  it('Jing is the copy recorded here', () => {
    expect(createHash('sha256').update(readFileSync(JAR)).digest('hex')).toBe(JAR_SHA256);
  });

  it('the schema is valid RELAX NG', () => {
    expect(jing()).toEqual({ status: 0, out: '' });
  });

  it('every valid sample, written as XML, is valid by the schema', () => {
    const files = all.filter((s) => s.group === 'valid').map((s) => write('valid', s.name, s.text));
    expect(files.length).toBeGreaterThan(20);
    expect(jing(...files)).toEqual({ status: 0, out: '' });
  });

  for (const name of GRAMMAR_CATCHES) {
    it(`problems/${name} is not valid by the schema either`, () => {
      const sample = all.find((s) => s.group === 'problems' && s.name === name);
      expect(sample, name).toBeDefined();
      const r = jing(write('problem', name, sample!.text));
      expect(r.status, r.out).not.toBe(0);
    });
  }
});
