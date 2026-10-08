# HoloML for VS Code

Write [HoloML](https://github.com/srajpal/holoml) pages in VS Code, and in
editors built on it (VS Code 1.96 or newer). HoloML is a markup language
for fully 3D websites; files use the extension `.holoml`.

## What it does

- **Syntax colours** for tags, attributes, values, comments, and
  character references, in the same colours as HTML in every theme.
- **Mistakes underlined as you type**, with the words and codes of
  HoloML's own checker, in the Problems panel. The checks are the same as
  HyperSpace 3D's, the browser that shows HoloML pages.
- **Suggestions**: after `<`, only the elements allowed where you are;
  in a tag, its attributes; in a value, an attribute's choices, the
  versions, or the page's `#names`. Only what the page's `version` has
  is offered.
- **Help on hover** for every element and attribute, from the
  specification, and the meaning of a mistake's code.
- **Snippets**: `holoml` (a new page), `model`, `light`, `viewpoint`, `a`,
  `label`, and `group`.
- **Tags kept in step**: the end tag is written when you finish a start
  tag, or type `</`; and the start and end tag's names change together.
- **The outline and folding**: the page's elements in the Outline view
  and the breadcrumbs; folding by element, by comment, and between
  `<!-- #region -->` and `<!-- #endregion -->`.
- **Colours**: a swatch beside each colour value, and the colour picker.
- **Names**: go to the element a `#name` points to (F12), and find every
  reference to a name (Shift+F12).
- **Links to files**: Ctrl+click on a model, picture, sound, script, or
  page that is on the computer opens it.

## What it does not do

- No preview: open a page in
  [HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d) to
  see it.
- No network: the extension sends nothing anywhere, collects no
  telemetry, and never fetches the files a page names. It runs no code
  from the files it opens, so it works in untrusted workspaces too.

## Installing

The extension is not in the VS Code Marketplace. Build it from a copy of
the holoml repository (Node 24, pnpm 12):

```
pnpm install --frozen-lockfile
pnpm --filter holoml-vscode package
```

This makes `packages/vscode/holoml-vscode.vsix`. In VS Code, open the
Extensions view, choose "..." and then "Install from VSIX...", and pick
the file; or run `code --install-extension holoml-vscode.vsix`.

## Settings

- `holoml.autoClosingTags` (on by default): write end tags as you type.
- For HoloML files the extension turns on VS Code's own
  `editor.linkedEditing`, which changes a start tag's name and its end
  tag's together, and suggestions inside quotes.

## Other editors

The suggestions, mistakes, and the rest come from a language server, a
separate program that speaks the Language Server Protocol, which most
editors can use. After building, start it with
`node packages/vscode/dist/server.js --stdio`.

## Licence

Apache 2.0, as the rest of the holoml repository. The packages bundled
into the extension, and their licences, are listed in
THIRD-PARTY-NOTICES.txt.
