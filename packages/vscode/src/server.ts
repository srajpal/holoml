/**
 * HoloML's language server (Q2 a): the Language Server Protocol over the
 * functions in service/. VS Code starts it as its own process
 * (extension.ts); any editor that speaks LSP can start it too, with
 * `node dist/server.js --stdio`. It reads nothing but the documents it is
 * sent, the hover's words beside it (docs.json), and, for links, whether a
 * named file exists. It makes no network request.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProposedFeatures, TextDocumentSyncKind, TextDocuments, createConnection, type Diagnostic } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { complete } from './service/completion.ts';
import { diagnose } from './service/diagnostics.ts';
import { NO_DOCS, type Docs } from './service/docs.ts';
import { hover } from './service/hover.ts';
import { readOutline, type Outline } from './service/outline.ts';
import { folding, symbols } from './service/structure.ts';
import { autoClose, linkedEditing } from './service/tags.ts';
import { colorPresentations, colors, definition, findReferences, links } from './service/values.ts';

/** The custom request the extension sends after ">" or "/" is typed (tags.ts). */
export const AUTO_CLOSE = 'holoml/autoClose';
export interface AutoCloseParams {
  textDocument: { uri: string };
  position: { line: number; character: number };
  typed: '>' | '/';
}

function loadDocs(): Docs {
  try {
    return JSON.parse(readFileSync(join(__dirname, 'docs.json'), 'utf8')) as Docs;
  } catch {
    return NO_DOCS;
  }
}

const docs = loadDocs();
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

/** Each document's outline, read again only when its text changes. */
const outlines = new Map<string, { version: number; outline: Outline }>();
const outlineOf = (doc: TextDocument): Outline => {
  const cached = outlines.get(doc.uri);
  if (cached?.version === doc.version) return cached.outline;
  const outline = readOutline(doc.getText());
  outlines.set(doc.uri, { version: doc.version, outline });
  return outline;
};
const diagnostics = new Map<string, Diagnostic[]>();

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: ['<', '/', ' ', '"', "'", '#', '\n'] },
    hoverProvider: true,
    documentSymbolProvider: true,
    foldingRangeProvider: true,
    linkedEditingRangeProvider: true,
    colorProvider: true,
    definitionProvider: true,
    referencesProvider: true,
    documentLinkProvider: { resolveProvider: false },
  },
  serverInfo: { name: 'HoloML language server' },
}));

// Mistakes, a moment after typing pauses, and at once when a page opens.
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const validate = (doc: TextDocument) => {
  const found = diagnose(doc, outlineOf(doc));
  diagnostics.set(doc.uri, found);
  void connection.sendDiagnostics({ uri: doc.uri, version: doc.version, diagnostics: found });
};
documents.onDidOpen((e) => validate(e.document));
documents.onDidChangeContent((e) => {
  clearTimeout(timers.get(e.document.uri));
  timers.set(
    e.document.uri,
    setTimeout(() => {
      timers.delete(e.document.uri);
      const doc = documents.get(e.document.uri);
      if (doc) validate(doc);
    }, 200),
  );
});
documents.onDidClose((e) => {
  clearTimeout(timers.get(e.document.uri));
  timers.delete(e.document.uri);
  outlines.delete(e.document.uri);
  diagnostics.delete(e.document.uri);
  void connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

/** The document and the offset a request names, or null when the document is not open. */
const at = (uri: string, position?: { line: number; character: number }) => {
  const doc = documents.get(uri);
  if (!doc) return null;
  return { doc, outline: outlineOf(doc), offset: position ? doc.offsetAt(position) : 0 };
};

connection.onCompletion((p) => {
  const a = at(p.textDocument.uri, p.position);
  return a ? complete(a.doc, a.outline, a.offset, docs) : null;
});
connection.onHover((p) => {
  const a = at(p.textDocument.uri, p.position);
  return a ? hover(a.doc, a.outline, a.offset, docs, diagnostics.get(a.doc.uri)) : null;
});
connection.onDocumentSymbol((p) => {
  const a = at(p.textDocument.uri);
  return a ? symbols(a.doc, a.outline) : null;
});
connection.onFoldingRanges((p) => {
  const a = at(p.textDocument.uri);
  return a ? folding(a.doc, a.outline) : null;
});
connection.languages.onLinkedEditingRange((p) => {
  const a = at(p.textDocument.uri, p.position);
  return a ? linkedEditing(a.doc, a.outline, a.offset) : null;
});
connection.onDocumentColor((p) => {
  const a = at(p.textDocument.uri);
  return a ? colors(a.doc, a.outline) : [];
});
connection.onColorPresentation((p) => colorPresentations(p.color, p.range));
connection.onDefinition((p) => {
  const a = at(p.textDocument.uri, p.position);
  return a ? definition(a.doc, a.outline, a.offset) : null;
});
connection.onReferences((p) => {
  const a = at(p.textDocument.uri, p.position);
  return a ? findReferences(a.doc, a.outline, a.offset, p.context.includeDeclaration) : null;
});
connection.onDocumentLinks((p) => {
  const a = at(p.textDocument.uri);
  return a
    ? links(a.doc, a.outline, (uri) => {
        try {
          return existsSync(fileURLToPath(uri));
        } catch {
          return false;
        }
      })
    : null;
});
connection.onRequest(AUTO_CLOSE, (p: AutoCloseParams) => {
  const a = at(p.textDocument.uri, p.position);
  return a ? autoClose(a.outline, a.offset, p.typed) : null;
});

documents.listen(connection);
connection.listen();
