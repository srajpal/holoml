// Z2: the syntax colours. The grammar's own tests (syntaxes/tests/, run by
// vscode-tmgrammar-test), and every example site and valid conformance
// sample coloured with nothing in a tag left without its colour and
// nothing marked a mistake.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { INITIAL, Registry, parseRawGrammar, type IGrammar } from 'vscode-textmate';
import { createOnigScanner, createOnigString, loadWASM } from 'vscode-oniguruma';
import { PACKAGE, pages, read } from './test-support.ts';

const require = createRequire(import.meta.url);
const GRAMMAR = join(PACKAGE, 'syntaxes/holoml.tmLanguage.json');

let grammar: IGrammar;
beforeAll(async () => {
  await loadWASM(readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer as ArrayBuffer);
  const registry = new Registry({
    onigLib: Promise.resolve({ createOnigScanner, createOnigString }),
    loadGrammar: async () => parseRawGrammar(readFileSync(GRAMMAR, 'utf8'), GRAMMAR),
  });
  grammar = (await registry.loadGrammar('text.holoml'))!;
});

/** Each token of a page with its scopes. */
function tokens(text: string): { text: string; scopes: string[] }[] {
  const out: { text: string; scopes: string[] }[] = [];
  let state = INITIAL;
  for (const line of text.split(/\r?\n/)) {
    const r = grammar.tokenizeLine(line, state);
    for (const t of r.tokens) out.push({ text: line.slice(t.startIndex, t.endIndex), scopes: t.scopes });
    state = r.ruleStack;
  }
  return out;
}

describe('syntax colours', () => {
  it("passes the grammar's own tests", () => {
    const cli = join(PACKAGE, 'node_modules/vscode-tmgrammar-test/dist/unit.js');
    // Throws, with the tool's report, when a test fails.
    execFileSync(process.execPath, [cli, '-g', GRAMMAR, join(PACKAGE, 'syntaxes/tests/*.test.holoml')], { cwd: PACKAGE, encoding: 'utf8' });
  });

  it.each([...pages('examples'), ...pages('conformance/valid')])('%s: every part of every tag has its colour, and nothing is marked a mistake', (path) => {
    for (const t of tokens(read(path))) {
      expect(t.scopes.filter((s) => s.startsWith('invalid')), JSON.stringify(t)).toEqual([]);
      const inTag = t.scopes.includes('meta.tag.holoml');
      if (inTag && t.text.trim() !== '') expect(t.scopes.length, JSON.stringify(t)).toBeGreaterThan(2);
    }
  });
});
