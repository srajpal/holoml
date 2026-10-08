# Write HoloML in VS Code

This guide sets up VS Code, or an editor built on it, for writing HoloML
pages: installing the HoloML extension from the holoml repository, what
it does while you type, and what it leaves to the browser.

## Install the extension

The extension is not in the VS Code Marketplace; it is built from the
holoml repository and installed from a file. You need Node 24 or
newer, pnpm 12, and VS Code 1.96 or newer.

1. In a copy of the repository, install its packages and make the
   extension:

   ```text
   pnpm install --frozen-lockfile
   pnpm --filter holoml-vscode package
   ```

   This makes `packages/vscode/holoml-vscode.vsix`, the file an extension
   is installed from.

2. In VS Code, open the Extensions view, choose "..." at its top, then
   "Install from VSIX...", and pick the file. Or, from a terminal:

   ```text
   code --install-extension packages/vscode/holoml-vscode.vsix
   ```

3. Open any `.holoml` file. "HoloML" shows in the status bar, at the
   right, as the file's language.

To update it, make the file again from a newer copy of the repository
and install it the same way.

## While you type

Start a page by typing `holoml` and choosing the "New page" snippet: a
title, a place to stand, and two lights.

```holoml
<holoml version="0.2">
  <head>
    <title>My page</title>
  </head>
  <scene background="#101820">
    <viewpoint position="0 1.6 6" look-at="0 1 0" mode="orbit" />
    <light type="ambient" intensity="0.4" />
    <light type="directional" position="3 6 4" intensity="1.2" />
  </scene>
</holoml>
```

Then, as you write:

- **Suggestions.** Type `<` inside the scene and the list holds only what
  a scene may hold; inside a `group`, what a group may hold. In a tag,
  press Ctrl+Space for its attributes; in a value, for its choices (a
  light's `type`), the versions, or the page's `#names`. A page that says
  `version="0.1"` is offered only what 0.1 has.
- **Mistakes.** Each is underlined as you type, with the checker's own
  words and code, and listed in the Problems panel (Ctrl+Shift+M). They
  are the mistakes HyperSpace 3D would find: the extension and the
  browser use the same checker. Hover over one to see what its code
  means; the code links to the [list of codes](../reference/codes.md).
- **Help on hover.** Hover over an element or an attribute to read what
  it is, from the specification, with the version it came in.
- **End tags.** Finish a start tag with `>` and its end tag is written
  after the cursor; type `</` and the open element's name is written.
  Change a start tag's name and its end tag changes with it.
- **The outline.** The Outline view, and the breadcrumbs above the page,
  show its elements, with each one's id and its file or text. Fold an
  element, a comment, or the lines between `<!-- #region name -->` and
  `<!-- #endregion -->`.
- **Colours.** Each colour value has a swatch beside it; click the swatch
  to choose a colour, written as `#rrggbb`.
- **Names.** On a reference such as `target="#lamp"`, F12 goes to the
  element with that id, and Shift+F12 lists every reference to it.
- **Files.** Ctrl+click a model, picture, sound, script, or page the page
  names, when it is on the computer, to open it.

## What it leaves to the browser

The extension shows no preview. To see a page, open it in
[HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d): choose
"Open a HoloML file…" in its menu, or drop the file on its window. With the
page open in both, save in VS Code and reload in the browser.

It also never goes on the network. It sends nothing anywhere, collects
nothing, and does not fetch the files a page names, even those on the
web; it runs no code from the files it opens.

## Settings

- `holoml.autoClosingTags` writes end tags as you type; turn it off in
  Settings if you prefer to write them yourself.
- For HoloML files the extension turns on VS Code's `editor.linkedEditing`
  (start and end tags renamed together) and suggestions inside quotes;
  both can be changed in Settings, for the HoloML language.

## Other editors

Editors that speak the Language Server Protocol (Neovim, Zed, Helix,
Sublime Text, and others) can use the same checks and suggestions: after
making the extension, start `node packages/vscode/dist/server.js --stdio`
as the language server for `.holoml` files, as each editor's settings
describe. The syntax colours are VS Code's own format (a TextMate
grammar, `packages/vscode/syntaxes/holoml.tmLanguage.json`), which some
other editors read too.
