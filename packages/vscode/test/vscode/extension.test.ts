// The extension inside a real VS Code (task 7, Z1 and Z3 to Z8): run by
// `pnpm --filter holoml-vscode test:vscode`, with test/fixtures/ as the
// folder open. Each check asks VS Code itself, through its commands, so
// that what is checked is what a person sees.
import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';

const fixture = (name: string) => vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0]!.uri, name);

async function open(name: string): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument(fixture(name));
  return vscode.window.showTextDocument(doc);
}

/** Waits for a condition, checking every 50 ms, for at most 20 seconds; `seen` says what there was instead. */
async function until<T>(what: string, test: () => T | undefined | Promise<T | undefined>, seen?: () => string): Promise<T> {
  const stop = Date.now() + 20_000;
  for (;;) {
    const value = await test();
    if (value) return value;
    if (Date.now() > stop) throw new Error(`waited 20 seconds for ${what}${seen ? `; found ${seen()}` : ''}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** A new, unsaved HoloML page in an editor, once the language server has it. */
async function scratch(content: string): Promise<vscode.TextEditor> {
  const editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument({ language: 'holoml', content }));
  await until('the language server for the new page', async () => ((await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', editor.document.uri)) ?? []).length > 0);
  return editor;
}

const at = (doc: vscode.TextDocument, needle: string, plus = 0) => doc.positionAt(doc.getText().indexOf(needle) + plus);

describe('HoloML in VS Code', () => {
  let page: vscode.TextEditor;

  before(async () => {
    page = await open('page.holoml');
    // The language server has started once it answers.
    await until('the language server', async () => ((await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', page.document.uri)) ?? []).length > 0);
  });

  it('knows a .holoml file as HoloML, and turns on with it', () => {
    assert.equal(page.document.languageId, 'holoml');
    const extension = vscode.extensions.all.find((e) => e.packageJSON.name === 'holoml-vscode');
    assert.ok(extension?.isActive);
  });

  it('underlines a mistake with the checker’s code, and clears a fixed one', async () => {
    const bad = await open('bad.holoml');
    const found = await until('the mistake', () => vscode.languages.getDiagnostics(bad.document.uri).find((d) => d.code !== undefined));
    assert.equal(typeof found.code === 'object' ? found.code.value : found.code, 'unknown-element');
    assert.equal(found.source, 'holoml');
    assert.equal(bad.document.getText(found.range), '<modl');
    const where = new vscode.Range(at(bad.document, 'modl'), at(bad.document, 'modl', 4));
    await bad.edit((e) => e.replace(where, 'model'));
    await until('no mistakes', () => vscode.languages.getDiagnostics(bad.document.uri).length === 0);
    await vscode.commands.executeCommand('undo');
    assert.equal(vscode.languages.getDiagnostics(page.document.uri).length, 0);
  });

  it('suggests the elements allowed inside the scene', async () => {
    const doc = page.document;
    const position = at(doc, '<model', 1);
    const list = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', doc.uri, position, '<');
    const labels = list.items.map((i) => (typeof i.label === 'string' ? i.label : i.label.label));
    for (const name of ['model', 'light', 'group', 'panel']) assert.ok(labels.includes(name), name);
    assert.ok(!labels.includes('title'));
  });

  it('explains an element on hover', async () => {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', page.document.uri, at(page.document, '<model', 2));
    const text = hovers.flatMap((h) => h.contents.map((c) => (typeof c === 'string' ? c : c.value))).join('\n');
    assert.match(text, /A 3D model from a glTF 2\.0 file\./);
  });

  it('lists the page in the outline, and folds it', async () => {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', page.document.uri);
    assert.equal(symbols[0]!.name, 'holoml');
    const scene = symbols[0]!.children.find((s) => s.name === 'scene')!;
    assert.deepEqual(
      scene.children.map((s) => s.name),
      ['viewpoint #start', 'light #lamp', 'model #box', 'animate', 'a'],
    );
    const folds = await vscode.commands.executeCommand<vscode.FoldingRange[]>('vscode.executeFoldingRangeProvider', page.document.uri);
    assert.ok(folds.some((f) => f.start === 0));
  });

  it('shows colour swatches', async () => {
    const colors = await vscode.commands.executeCommand<vscode.ColorInformation[]>('vscode.executeDocumentColorProvider', page.document.uri);
    assert.deepEqual(
      colors.map((c) => page.document.getText(c.range)),
      ['#101820', '#ffcc88'],
    );
  });

  it('goes from a #name to its element, and finds its references', async () => {
    const doc = page.document;
    const defs = await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>('vscode.executeDefinitionProvider', doc.uri, at(doc, '#lamp', 2));
    const def = defs[0]!;
    const range = 'targetRange' in def ? def.targetRange : def.range;
    assert.equal(doc.getText(range), 'lamp');
    const refs = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', doc.uri, at(doc, 'id="lamp"', 5));
    assert.deepEqual(refs.map((r) => doc.getText(r.range)).sort(), ['#lamp', 'lamp']);
  });

  it('links the files a page names', async () => {
    const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>('vscode.executeLinkProvider', page.document.uri);
    const targets = links.map((l) => l.target?.path.split('/').slice(-2).join('/'));
    assert.deepEqual(targets.sort(), ['fixtures/next.holoml', 'models/box.glb']);
  });

  it('comments a line out with the comment command, and writes end tags as you type', async () => {
    const editor = await scratch('<holoml version="0.2">\n  <scene>\n    \n  </scene>\n</holoml>\n');
    const blank = new vscode.Position(2, 4);
    editor.selection = new vscode.Selection(blank, blank);
    await vscode.commands.executeCommand('type', { text: '<group' });
    await vscode.commands.executeCommand('type', { text: '>' });
    await until('the end tag', () => editor.document.lineAt(2).text.includes('<group></group>'), () => JSON.stringify(editor.document.lineAt(2).text));
    // The cursor stays between the tags.
    assert.equal(editor.selection.active.character, '    <group>'.length);
    await vscode.commands.executeCommand('editor.action.commentLine');
    assert.match(editor.document.lineAt(2).text, /^\s*<!-- <group><\/group> -->$/);
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  });

  it('renames the end tag with its start tag as you type', async () => {
    assert.equal(vscode.workspace.getConfiguration('editor', { languageId: 'holoml' }).get('linkedEditing'), true);
    const editor = await scratch('<holoml version="0.2">\n  <scene>\n    <group>\n    </group>\n  </scene>\n</holoml>\n');
    const inName = new vscode.Position(2, '    <group'.length);
    editor.selection = new vscode.Selection(inName, inName);
    // VS Code asks for the pair of names once the cursor rests in one; typing then changes both.
    await new Promise((r) => setTimeout(r, 1000));
    await vscode.commands.executeCommand('type', { text: 's' });
    await until('the end tag renamed', () => editor.document.lineAt(3).text.trim() === '</groups>', () => JSON.stringify(editor.document.lineAt(3).text));
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  });
});
