// Z1 and Z9: the built extension. Its bundles hold no code that reaches
// the network; the language server, run as an editor runs it, answers
// for every example site with every way out to the network refused; and
// the .vsix carries only what it should.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PACKAGE, REPOSITORY, pages, read } from './test-support.ts';

const temp = mkdtempSync(join(tmpdir(), 'holoml-vscode-'));
beforeAll(() => {
  execFileSync(process.execPath, [join(PACKAGE, 'build.mjs')], { cwd: PACKAGE, stdio: 'pipe' });
}, 120_000);
afterAll(() => rmSync(temp, { recursive: true, force: true }));

describe('the built extension', () => {
  it('holds no code that reaches the network', () => {
    for (const file of ['extension.js', 'server.js']) {
      const code = readFileSync(join(PACKAGE, 'dist', file), 'utf8');
      // "net" is there: vscode-jsonrpc can speak over a socket or a pipe. The server speaks over
      // standard input and output or Node's own channel to VS Code, which the test below holds it to.
      for (const module of ['http', 'https', 'http2', 'tls', 'dgram', 'dns', 'undici', 'node:http', 'node:https', 'node:http2', 'node:tls', 'node:dgram', 'node:dns']) {
        expect(code.includes(`require("${module}")`), `${file} requires ${module}`).toBe(false);
      }
      expect(/\bfetch\(|XMLHttpRequest|WebSocket\(/.test(code), `${file} fetches`).toBe(false);
    }
  });

  it('answers as a language server for every example site, with every way out to the network refused', async () => {
    const preload = join(temp, 'no-network.cjs');
    // Every way Node reaches the network, replaced by one that records the attempt and fails.
    writeFileSync(
      preload,
      `const tried = (what) => () => { process.stderr.write('NETWORK ' + what + '\\n'); throw new Error('no network: ' + what); };
for (const [name, fns] of [['net', ['connect', 'createConnection']], ['tls', ['connect']], ['http', ['request', 'get']], ['https', ['request', 'get']], ['http2', ['connect']], ['dgram', ['createSocket']], ['dns', ['lookup', 'resolve', 'resolve4', 'resolve6']]]) {
  const m = require(name);
  for (const fn of fns) m[fn] = tried(name + '.' + fn);
}
require('net').Socket.prototype.connect = tried('net.Socket.connect');
globalThis.fetch = tried('fetch');
`,
    );
    const server = spawn(process.execPath, ['--require', preload, join(PACKAGE, 'dist/server.js'), '--stdio'], { cwd: PACKAGE });
    let stderr = '';
    server.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    const lsp = client(server);
    try {
      await lsp.request('initialize', { processId: process.pid, rootUri: null, capabilities: {} });
      lsp.notify('initialized', {});
      const examples = pages('examples');
      for (const path of examples) {
        const uri = pathToFileURL(join(REPOSITORY, path)).href;
        const text = read(path);
        lsp.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'holoml', version: 1, text } });
        const diagnostics = await lsp.diagnostics(uri);
        expect(diagnostics, path).toEqual([]);
        const middle = text.indexOf('<model');
        // On the name of the page's first model.
        const position = { line: text.slice(0, middle).split('\n').length - 1, character: middle - text.lastIndexOf('\n', middle) + 1 };
        const id = { textDocument: { uri } };
        const hover = (await lsp.request('textDocument/hover', { ...id, position })) as { contents: { value: string } } | null;
        if (middle >= 0) expect(hover?.contents.value, path).toContain('<model>');
        await lsp.request('textDocument/completion', { ...id, position });
        expect(await lsp.request('textDocument/documentSymbol', id)).not.toEqual([]);
        await lsp.request('textDocument/foldingRange', id);
        await lsp.request('textDocument/documentColor', id);
        // Asks the computer whether each named file exists; the web is never asked.
        await lsp.request('textDocument/documentLink', id);
      }
      await lsp.request('shutdown', null);
      lsp.notify('exit', null);
    } finally {
      server.kill();
    }
    expect(stderr).not.toContain('NETWORK');
  }, 120_000);

  it('makes a .vsix of the bundles, the grammar, the snippets, the settings, the README, and the licences, and nothing else', () => {
    const vsce = join(PACKAGE, 'node_modules/@vscode/vsce/vsce');
    const listed = execFileSync(process.execPath, [vsce, 'ls', '--no-dependencies'], { cwd: PACKAGE, encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean)
      .map((f) => f.replace(/\\/g, '/'))
      .sort();
    expect(listed).toEqual(
      [
        'LICENSE',
        'NOTICE',
        'README.md',
        'THIRD-PARTY-NOTICES.txt',
        'dist/docs.json',
        'dist/extension.js',
        'dist/server.js',
        'language-configuration.json',
        'package.json',
        'snippets/holoml.json',
        'syntaxes/holoml.tmLanguage.json',
      ].sort(),
    );
  }, 120_000);
});

/** A small client of the Language Server Protocol over a process's standard input and output. */
function client(server: ReturnType<typeof spawn>) {
  let buffer = Buffer.alloc(0);
  let next = 1;
  const waiting = new Map<number, (result: unknown) => void>();
  const published = new Map<string, unknown[]>();
  const listeners: (() => void)[] = [];
  server.stdout!.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const head = buffer.indexOf('\r\n\r\n');
      if (head < 0) return;
      const length = Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0, head).toString())![1]);
      if (buffer.length < head + 4 + length) return;
      const message = JSON.parse(buffer.subarray(head + 4, head + 4 + length).toString()) as { id?: number; method?: string; result?: unknown; params?: { uri: string; diagnostics: unknown[] } };
      buffer = buffer.subarray(head + 4 + length);
      if (message.id !== undefined && message.method === undefined) waiting.get(message.id)?.(message.result);
      else if (message.method === 'textDocument/publishDiagnostics') {
        published.set(message.params!.uri, message.params!.diagnostics);
        for (const l of listeners.splice(0)) l();
      } else if (message.id !== undefined) send({ jsonrpc: '2.0', id: message.id, result: null });
    }
  });
  const send = (message: object) => {
    const body = JSON.stringify(message);
    server.stdin!.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  };
  return {
    request: (method: string, params: unknown) =>
      new Promise<unknown>((resolve) => {
        const id = next++;
        waiting.set(id, resolve);
        send({ jsonrpc: '2.0', id, method, params });
      }),
    notify: (method: string, params: unknown) => send({ jsonrpc: '2.0', method, params }),
    diagnostics: (uri: string) =>
      new Promise<unknown[]>((resolve) => {
        const check = () => (published.has(uri) ? resolve(published.get(uri)!) : listeners.push(check));
        check();
      }),
  };
}
