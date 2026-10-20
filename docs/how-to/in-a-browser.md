# Show a HoloML page in an ordinary browser

This guide opens a HoloML page in Chrome, Firefox, or Safari, by link,
through the HoloML viewer that HyperSpace 3D publishes on a plain web
page; and it puts such a link on your own site. The viewer is the
browser's own, with the browser's rules for what a page may load.

## Open an example

Each example site has an "Open it here" link on its front page, and the
[home page](../index.md) lists one for each. The link's form is the
viewer's address followed by `?page=` and the page's own:

```text
https://srajpal.github.io/hypersol-hyperspace-3d/viewer/?page=https://srajpal.github.io/holoml/showroom/index.holoml
```

The page opens across the browser's window, under a thin bar: the
page's title, **Text view** (or Ctrl+Shift+V), which shows the page as
the outline a screen reader hears, **Stop** (or Esc) while models are
still loading, and links to HyperSpace 3D and to HoloML. The mouse, the
keyboard, and touch work as in HyperSpace 3D
([Walk around, with walls and gravity](walking.md)).

## Show your own page

Put the page and its files on a site served over https, as
[Publish a site](publishing.md) describes, and make the link the same
way: the viewer's address, `?page=`, and your page's address. For a
page you are still writing, serve it from your own computer: an http
address on `localhost` or `127.0.0.1` is fetched too.

Five things to know:

- **Another site's page shows without its scripts.** The viewer's page
  runs scripts only from its own site, so a page of HoloML's examples
  (on the same site) runs them, and a page of yours shows its models,
  pictures, sounds, and everything else, with a line at the bottom
  saying its scripts were not run. For a page whose scripts matter,
  the whole of it is in HyperSpace 3D.
- **The site has to allow cross-origin reads.** The viewer fetches your
  page and its files from its own page, on another site, so your server
  answers with the `Access-Control-Allow-Origin` header. GitHub Pages
  does; most static hosts do or can be told to.
- **The page's limits are the viewer's.** A page is read up to 2 MB of
  text, as in HyperSpace 3D, and the limits of the specification's
  section on resources apply to its models and pictures.
- **A link to another HoloML page opens in the viewer.** It goes to the
  viewer's own address with `?page=` and the next page's, so Back
  returns and the link can be copied; a link to an ordinary web page
  goes to that page, as anywhere.
- **A script reads its page's address from `document.baseURI`.** In the
  viewer, `location` is the viewer's own address (`…/viewer/?page=…`),
  so a page that takes something from its query, as the sneaker store's
  shoe takes `?colour=`, reads `new URL(document.baseURI).searchParams`,
  which is the page's own address in HyperSpace 3D too.

Without WebGL 2 the viewer says the page cannot be drawn, as HyperSpace
3D does.

## Put the link on your page

A plain link works anywhere HTML does:

```html
<a href="https://srajpal.github.io/hypersol-hyperspace-3d/viewer/?page=https://example.org/room.holoml">Walk around the room</a>
```

A page's front page that cannot show HoloML itself, as the examples'
`index.html` files, is the place for it: a visitor without HyperSpace
3D still gets the room.

## What the viewer sends

Nothing but what the page names: it fetches the page and its files
from their addresses, keeps nothing in the browser, and has no
analytics. HyperSpace 3D's
[privacy page](https://github.com/srajpal/hypersol-hyperspace-3d/blob/main/docs/privacy.md)
describes it under "The viewer on the web".
