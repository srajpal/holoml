/**
 * The VS Code extension: it starts HoloML's language server (server.ts)
 * for `.holoml` files and writes end tags as they are typed. Everything
 * else (mistakes, suggestions, hover, the outline, colours, names, and
 * links) comes from the server. The syntax colours, the editing basics,
 * and the snippets are declared in package.json.
 */
import * as vscode from 'vscode';
import { LanguageClient, TransportKind, type LanguageClientOptions, type ServerOptions } from 'vscode-languageclient/node';

const AUTO_CLOSE = 'holoml/autoClose';

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const module = context.asAbsolutePath('dist/server.js');
  // A child process, spoken to through Node's own channel: nothing listens on the network.
  const server: ServerOptions = { module, transport: TransportKind.ipc };
  const options: LanguageClientOptions = { documentSelector: [{ language: 'holoml' }] };
  client = new LanguageClient('holoml', 'HoloML', server, options);
  await client.start();
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => void closeTag(e)));
}

export async function deactivate(): Promise<void> {
  await client?.stop();
}

/** After ">" that finishes a start tag, or "</", asks the server what to write, and writes it at the cursor. */
async function closeTag(e: vscode.TextDocumentChangeEvent): Promise<void> {
  const doc = e.document;
  const editor = vscode.window.activeTextEditor;
  if (!client || doc.languageId !== 'holoml' || editor?.document !== doc || e.contentChanges.length !== 1) return;
  if (e.reason === vscode.TextDocumentChangeReason.Undo || e.reason === vscode.TextDocumentChangeReason.Redo) return;
  if (!vscode.workspace.getConfiguration('holoml', doc).get<boolean>('autoClosingTags', true)) return;
  const change = e.contentChanges[0]!;
  const typed = change.text;
  if (change.rangeLength !== 0 || (typed !== '>' && typed !== '/')) return;
  const position = change.range.start.translate(0, 1);
  const version = doc.version;
  // A moment first, as VS Code's HTML support waits: the change must reach the server before the question does.
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (doc.version !== version) return;
  const snippet = await client.sendRequest<string | null>(AUTO_CLOSE, {
    textDocument: { uri: doc.uri.toString() },
    position: { line: position.line, character: position.character },
    typed,
  });
  // Only if nothing has changed while the server was asked, and the cursor is still where the character went.
  const active = vscode.window.activeTextEditor;
  if (!snippet || active?.document !== doc || doc.version !== version || !active.selection.active.isEqual(position)) return;
  await active.insertSnippet(new vscode.SnippetString(snippet), position, { undoStopBefore: false, undoStopAfter: false });
}
