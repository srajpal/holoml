# Try a page in the playground

This guide writes and changes a HoloML page in the
[playground](https://srajpal.github.io/holoml/playground/), a page of
this site with the page's text on the left and the scene on the right.
Nothing needs installing, and nothing you write leaves the page.

## Start from a page

The playground opens with a first page: a car, a light or two, and a
label. **Start from** offers it and each example site, so you can read
and change a whole site's front page, with its models, pictures, and
scripts, as it is on the site. A link can open the playground on an
example by its folder's name, with `?preset=`:

```text
https://srajpal.github.io/holoml/playground/?preset=harbour-loft
```

Choosing another page when you have changed the text asks first. The
text is kept in the browser's tab while it is open, so a reload does
not lose it; closing the tab does.

## Change it, and see the problems

Type in the text. A quarter of a second after the last key, HoloML's
own checker reads the page, the same as a browser that knows HoloML
does, and **Problems** lists what it found:

- A mistake in the syntax, such as a tag never closed or a value without
  quotes, stops the reading where it is: one problem, with its line and
  column.
- Otherwise, every problem the checker finds, in the order of the page:
  an attribute an element does not take, a value of the wrong kind, a
  reference to a name that is not there.

Each problem names its line, its column, and its code (the codes are in
the [reference](../reference/codes.md)). Click one, or reach it with
Tab and press Enter, to put the cursor there. The line numbers beside
the text mark the lines that have one.

## Draw it

A second after the last key, when the page has no problems, the scene
on the right draws it again. **Run**, or Ctrl+Enter in the text (⌘ and
Enter on a Mac), draws it at once, even with problems the checker
found, as long as the syntax can be read. For a big page that takes a
while to draw, turn **Draw as I type** off and draw it with Run.

While the page has a problem, the scene keeps the last version that had
none, dimmed, with a line saying so.

The scene is drawn by HyperSpace 3D's viewer, the one that opens the
examples in an ordinary browser ([Show a HoloML page in an ordinary
browser](in-a-browser.md)), with the same rules: the page's models,
pictures, and sounds are fetched from where its addresses lead, and its
scripts run only from this site. A page in the playground lives at its
preset's address, so `models/quellis.glb` in the first page is the
showroom's, and a page of Harbour Loft names Harbour Loft's files.

## The keys

- **Tab** leaves the text for the next control, as everywhere on the
  site; it does not indent.
- **Ctrl+]** and **Ctrl+[** indent and outdent the lines chosen, by two
  spaces.
- **Ctrl+Enter** draws the page now.
- In the scene: the keys of the viewer, such as the arrow keys or W, A,
  S, and D to walk, once the scene has the keyboard (click it, or Tab
  to it), and Ctrl+Shift+V for its text view.

## What it cannot do

- Save or share a page. Copy the text out to keep it, and publish it
  as [Publish a site](publishing.md) says.
- Use your own models. A page can name models anywhere on this site;
  for your own files, serve them from your computer and open the page
  in HyperSpace 3D, or in the viewer with `?page=` and a `localhost`
  address ([Show a HoloML page in an ordinary
  browser](in-a-browser.md)).
- Follow a link to another HoloML page: the viewer on a plain page
  does not open the next page itself yet, so a link in the scene leaves
  the playground's scene for the file.
- Draw without WebGL 2. In a browser without it the problems still
  work, and the scene's place says why it is empty.
