# Publish a site

This guide puts a HoloML site on the web, so that any browser that shows
HoloML can open it: what a site holds, how its pages name their files,
serving it, and publishing it with GitHub Pages, as the holoml
repository publishes its example sites. It ends with checking every
page, and trying the site from your computer while you work.

## What a site holds

A site is a folder of files: its pages, and the models, pictures,
sounds, and scripts they use, in folders next to them. Harbour Loft's:

```text
harbour-loft/
  index.holoml      the flat, the page to open first
  terrace.holoml    the roof terrace
  about.holoml      about the tour
  index.html        a web page for browsers that do not show HoloML
  booking.html      an ordinary web page: a form that sends nothing
  loft.js           the pages' script
  README.md         notes on the site
  light/            the panoramas of the sky and of the light
  models/           the models (.glb), and CREDITS.md
  plans/            the floor plan
  sounds/           the doors' and the switches' sounds
  tools/            the scripts that make the site (not published)
```

Name each file exactly as the pages write it, capitals included: many
web servers treat `Door.glb` and `door.glb` as two files, though
Windows does not.

## Use relative addresses

Write each address relative to the page, as in HTML: the renderer
resolves it against the page's own address. In
`https://srajpal.github.io/holoml/harbour-loft/index.holoml`,
`models/door.glb` is
`https://srajpal.github.io/holoml/harbour-loft/models/door.glb`. The
same holds for links (`href="terrace.holoml"`,
`href="index.holoml#terrace-door"`, `href="booking.html"`) and for a
script's imports (the sneaker store's scripts share a module with
`import { cartSummary, readCart } from './colourways.js';`). A site
written this way works in any folder of any server, and from your
computer. Only relative, `http:`, and `https:` addresses may be used: a
checker reports a `javascript:`, `data:`, or `file:` address as an
`unsafe-link`.

## Keep every file on the page's own site

A page's own site is the scheme, host, and port of its address, such as
`https://srajpal.github.io`. A renderer loads the page's scripts,
sounds, and pictures (a material's pictures, the scene's `environment`
and `sky`, and a plan's picture) from there only, and leaves out any
from elsewhere. It should load models only from the page's own site or
from sites it permits, so keep them there too. A page's scripts may
`fetch` files from its own site.

## Serve it from a web server

Any web server that serves files will do: the files are sent as they
are, and nothing runs on the server. Copy the site's folder to it,
without the files that only make the site (the examples' `tools`
folders). A server labels each file with a media type, the kind of
file, such as `text/html`. HoloML's is `model/vnd.holoml`; it is not
registered yet, and many servers do not know it, so set it for
`.holoml` files where your server lets you. With Apache, for example:

```text
AddType model/vnd.holoml .holoml
```

HyperSpace 3D shows a page whose media type is `model/vnd.holoml`, and
also one whose address ends in `.holoml`, so a server that does not know
the type works too. When you share a site, give the page's own address,
ending in `index.holoml`: most servers answer the folder's address with
the folder's `index.html`.

## Give other browsers an index.html

Put an `index.html` beside `index.holoml`: a short web page that says
what the site is, and links to `index.holoml` for browsers that can
show it. Someone whose browser does not show HoloML then finds, at the
folder's address, a page that explains. Each example site has one,
such as [Harbour Loft's](../../examples/harbour-loft/index.html).

## Publish with GitHub Pages

GitHub Pages serves the files of a GitHub repository at
`https://<owner>.github.io/<repository>/`. The holoml repository
publishes its example sites this way: its workflow,
[`pages.yml`](https://github.com/srajpal/holoml/blob/main/.github/workflows/pages.yml),
builds HoloML's own pages (the specification and these guides), copies
each example site beside them without its `tools` folder, and
publishes the whole. Each site is then at
`https://srajpal.github.io/holoml/<site>/`, and its page at, for
example, `https://srajpal.github.io/holoml/harbour-loft/index.holoml`.
For a site of your own, put its folder in a repository, and turn on
GitHub Pages in the repository's settings: from a branch, or with a
workflow such as holoml's.

## Check every page first

HoloML's checker finds what a renderer would leave out or misread, such
as an unknown attribute, a target that no element has, or a value out
of range, and gives each mistake a code (the specification's
[section 8](../../SPEC.md#8-checking)) and its line and column. It is
the `@holoml/schema` package, with `@holoml/parser`, in the
[holoml repository](https://github.com/srajpal/holoml), and not on npm
yet. In a copy of the repository, after `pnpm install --frozen-lockfile`,
save this as `check.mjs` in its top folder:

```js
// check.mjs: checks HoloML pages, and lists each mistake with its place.
import { readFileSync } from 'node:fs';
import { parse } from './packages/parser/src/index.ts';
import { check } from './packages/schema/src/index.ts';

for (const file of process.argv.slice(2)) {
  try {
    const problems = check(parse(readFileSync(file, 'utf8')));
    for (const p of problems) console.log(`${file}:${p.line}:${p.column} ${p.code}: ${p.message}`);
    if (problems.length === 0) console.log(`${file}: no problems`);
    else process.exitCode = 1;
  } catch (e) {
    if (e.name !== 'HoloParseError') throw e;
    console.log(`${file}:${e.position.line}:${e.position.column} ${e.code}: ${e.detail}`);
    process.exitCode = 1;
  }
}
```

Run it there with your pages (Node 22 may first warn that type
stripping is experimental):

```text
node --experimental-strip-types check.mjs ../my-site/index.holoml ../my-site/about.holoml
```

It prints `no problems` for a page that is right, and otherwise each
mistake with its file, line, column, code, and message; a page with a
syntax error stops at the first. The holoml repository's tests check its
own example pages the same way (`pnpm test`).

## Try it from your computer while you work

HyperSpace 3D opens a `.holoml` file from the computer with Ctrl+O, from
its menu, or when you drop the file on its window. A page opened this
way can load files from its own folder and the folders inside it: keep
the whole site in the page's folder, with no `../` in its addresses, and
its files load from the computer as they will from the web.

HyperSpace 3D checks each page it opens as well: a syntax error shows
its line and column in place of the scene, and other problems are listed
in the console of its instrument panel (Ctrl+Shift+I), while the rest
of the scene shows. Its text view (Ctrl+Shift+V) shows the page as
text, a quick way to see that its words and names read well.

## See also

- The specification: [files](../../SPEC.md#4-files),
  [loading](../../SPEC.md#loading),
  [security](../../SPEC.md#12-security-considerations), and
  [the media type](../../SPEC.md#appendix-b-iana-considerations).
- [Your first HoloML page](../tutorials/first-page.md)
- [Prepare glTF models for a page](preparing-models.md)
- [The codes a checker reports](../reference/codes.md)
