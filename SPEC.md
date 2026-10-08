# HoloML 0.3

**A markup language for 3D web pages**

- This version: 0.3, first edition (2026-10-07)
- Status: experimental (see "Status of this document")
- Latest published version: https://srajpal.github.io/holoml/spec/
- Source: https://github.com/srajpal/holoml/blob/main/SPEC.md
- Previous version: 0.2, third edition: https://github.com/srajpal/holoml/blob/v0.2.2/SPEC.md
- First edition of 0.2: https://github.com/srajpal/holoml/blob/v0.2.0/SPEC.md
- Editors: The HoloML Authors
- Feedback: https://github.com/srajpal/holoml/issues
- Licence: this text is licensed under CC BY 4.0 (LICENSE-SPEC); the code
  in the repository is under Apache 2.0.

## Abstract

HoloML is a markup language for 3D web pages. A HoloML page describes a
scene: 3D models, where the viewer starts, lights, text, links, sound,
and animation, in an HTML-like syntax that people can write by hand. A
HoloML-aware browser shows the scene as a space the viewer can orbit or
walk around. This specification defines the language: its files, its
syntax, its elements and their meaning, the checks a reader makes, how
a renderer shows a page, and the scene API that a page's scripts use.

## Status of this document

HoloML is experimental. This specification is "published for
examination, experimental implementation, and evaluation", as the IETF
says of its experimental specifications [RFC7841]: HoloML has one
renderer so far, and until version 1.0 a later version may change or
remove what an earlier one has.

This document describes HoloML 0.3, in its first edition, of
2026-10-07. Version 0.3 adds names for models and groups, the language
and direction of text, a lighter model shown far away, and more of the
scene API; and it writes down, for every version, what earlier editions
left to each renderer: how a scene looks, the least a renderer has to
manage, and what a reader reports in two cases (appendix C lists the
changes). Versions 0.1 (2026-09-26) and 0.2 (2026-09-29, third edition
2026-09-30) are part of 0.3: every 0.1 and 0.2 page means the same in
0.3. Versions 0.1 and 0.2 are fixed: what a page written for either
means will not change.

HoloML is developed in the open at https://github.com/srajpal/holoml,
alongside its first renderer, HyperSol HyperSpace 3D
(https://github.com/srajpal/hypersol-hyperspace-3d). It follows W3C's
conventions for how a specification is written, but it is not a W3C
Recommendation, and it has not been through a standards body's
process. Comments are welcome as GitHub issues.

## 1. Introduction

*This section is non-normative.*

### A first page

```holoml
<holoml version="0.1">
  <head>
    <title>Showroom</title>
  </head>
  <scene background="#0b0f1e">
    <viewpoint position="0 1.6 6" look-at="0 0.8 0" mode="orbit" />
    <light type="ambient" intensity="0.4" />
    <light type="directional" position="4 8 5" intensity="1.2" />
    <a href="coupe.holoml">
      <model id="coupe" src="models/coupe.glb" rotation="0 30 0">
        <material name="Paint" color="#c0182a" metalness="0.8" roughness="0.3" />
      </model>
    </a>
    <label position="0 2.1 0">The coupe: click to walk around it</label>
    <animate target="#coupe" attribute="rotation" to="0 390 0" duration="20s" repeat="indefinite" />
  </scene>
</holoml>
```

The viewer starts 6 metres in front of a car and can orbit around it.
The car turns slowly, its paint is red, a label floats above it, and
clicking it opens another page.

### About this document

Sections 4 to 8 define pages: their files, syntax, values, elements, and
the problems a checker reports. Section 9 describes how a renderer shows
a page, section 10 the scene API for a page's scripts, and section 11
versions. Sections 12 to 15 consider security, privacy, accessibility,
and internationalization. The appendices give the formal grammar, the
media type's registration, and the changes between versions.

What version 0.2 added to 0.1 is marked "(0.2)"; a page uses it by
saying `version="0.2"` (section 11).

## 2. Conformance

### Requirement words

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD,
SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL in this
document are to be interpreted as described in BCP 14 [RFC2119]
[RFC8174] when, and only when, they appear in all capitals, as shown
here.

Everything in this specification is normative except sections marked
as non-normative, examples, and notes.

### Conformance classes

- A **conforming page** follows the syntax (section 5) and the rules of
  sections 6 and 7 for the version it declares: a conforming checker
  finds no syntax error and no problem in it.
- A **conforming checker** reads a page as section 5 says, stops at the
  first syntax error with its code and place, and otherwise reports
  every problem of section 8, with its code and place, for the version
  the page declares. It gives the results that the conformance samples
  give (below).
- A **conforming renderer** is a conforming checker that shows pages:
  it builds, loads, and draws the scene as sections 7 and 9 say, runs a
  0.2 page's scripts as section 10 says, and meets the requirements of
  sections 12 (security) and 14 (accessibility) that apply to
  renderers.

### The conformance samples

The repository's `conformance/` folder holds sample documents that pin
down this specification. Any reader can use them:

- `valid/`: documents that are correct. Each `.expected.json` gives the
  tree a reader MUST produce (every element with its name, its
  attributes with their values, its text, and the line and column where
  each starts), and an empty list of problems.
- `syntax-errors/`: documents that break the syntax. Each
  `.expected.json` gives the error code, line, and column.
- `problems/`: documents with correct syntax that break the rules. Each
  `.expected.json` gives every problem's code, line, and column, in
  document order.

Every element and attribute in this specification appears in at least
one valid sample. Samples for what 0.2 adds say `version="0.2"`; every
0.1 sample gives the same result as before.

## 3. Terminology

- **Page**: a HoloML document, written in the syntax of section 5.
- **Reader**: any program that reads HoloML, such as a browser, a
  checker, or an editor.
- **Checker**: a reader that checks a page and reports what it finds.
- **Renderer**: a reader that shows a page's scene to a person.
- **Viewer**: the person using a renderer; in the scene, where their eyes
  are.
- **Scene**: what a page shows: its `scene` element and everything in it.
- **Element**, **attribute**, and **text**: the parts of a page, as in
  section 5.
- **Thing**: a script's handle on an element (section 10).
- **Address**: a URL [URL], absolute or relative to the page's address.
- **The page's own site**: the origin of the page's address (its scheme,
  host, and port) [URL].
- **Left out**: not shown by a renderer, with a reason it gives, such as
  a file that could not be loaded or a limit that was reached.
- **Place**: a viewpoint the viewer can go to (section 7, `viewpoint`).
- **Trigger** and **click action**: section 7, "Click actions".
- **Reduced motion**: the viewer's wish for less movement, as the CSS
  media feature `prefers-reduced-motion` reports it.
- **Text view**: a renderer's text-only view of a page.
- **Outline**: a renderer's list of a page's links and named things,
  which the keyboard and screen readers reach.

## 4. Files

- File extension: `.holoml`.
- Encoding: UTF-8 [RFC3629]. A byte order mark at the start is allowed
  and ignored.
- Media type, when served over the web: `model/vnd.holoml`. It is in the
  same family as X3D's `model/x3d+xml`, and is not registered yet
  (appendix B gives its registration).
- 3D models are glTF 2.0 files (`.gltf` or `.glb`), the Khronos Group's
  open format [GLTF]; section 9 says how a renderer reads them.
- (0.2) Scripts are JavaScript modules (`.js` or `.mjs`) [ECMASCRIPT],
  and sounds are Ogg (`.ogg`), MP3 (`.mp3`), or WAV (`.wav`) files.

## 5. Syntax

HoloML looks like HTML but is strict: a reader stops at the first
mistake and reports it with its line and column, instead of guessing
what was meant. Appendix A gives the same syntax as a grammar.

- Whitespace, here and in the rest of this specification, is four
  characters: the space (U+0020), the tab (U+0009), the line feed
  (U+000A), and the carriage return (U+000D). Any other space, such as
  the no-break space (U+00A0), is a character like any other.
- A document MUST have exactly one root element. Only comments and
  whitespace MAY come before and after it.
- An element is written `<name attributes>content</name>`, or
  `<name attributes />` when it has no content. Every element MUST be
  closed, and an end tag MUST match the element it closes.
- Names of elements and attributes MUST use only lower-case letters,
  digits, and `-`, and MUST start with a letter. `<Scene>` is an error,
  not `<scene>`.
- Attribute values MUST be in double or single quotes: `size="0.2"` or
  `size='0.2'`. A value MUST NOT contain `<`; write `&lt;`.
- A flag attribute is written alone, with no value: `autoplay`.
- An attribute MUST NOT be given twice on one element, and attributes
  MUST be separated from the name and from each other by whitespace.
- Text is anything between tags. Text that is only whitespace is
  ignored; a character reference is not whitespace, whatever it stands
  for, so `&#32;` alone is text (though an element that needs text
  still has none with it: section 8). A reader keeps text as it is
  written, with its whitespace and its line ends. A comment inside text
  parts it in two, and the element's text is all of its texts, in
  order, joined: `<label>Rock <!-- a note --> pool</label>` says
  "Rock pool", as in HTML. (This was not said before 0.3, and holds for
  every version.) In `title` and `label`, runs of whitespace show as
  one space, and whitespace at the start and end is dropped, as in HTML.
  (0.2) In `hud`, each line of text is a line on the screen: within a
  line, runs of whitespace show as one space; empty lines are not shown.
- Character references: `&amp;` (&), `&lt;` (<), `&gt;` (>), `&quot;`
  ("), `&apos;` ('), and numbers such as `&#233;` or `&#xE9;` (é). An `&`
  that does not start one of these is an error; write `&amp;`.
- Comments are written `<!-- ... -->` and MUST NOT contain `--`. They MAY
  appear between elements, and MUST NOT appear inside a tag.
- Not part of HoloML: `<!doctype>`, `<?...?>`, and CDATA sections. The
  null character MUST NOT appear anywhere, comments included.
- Elements MUST NOT be nested more than 256 deep, the root included. A
  reader MUST stop a deeper document with `too-deep`, rather than fail
  in some other way.
- Lines MAY end with `\n`, `\r\n`, or `\r`. Columns count UTF-16 code
  units, as most editors do. A byte order mark is not part of line 1:
  the first character after it is at line 1, column 1.

### Syntax errors

A reader MUST stop at the first syntax error and report its code and
place. The codes:

| Code | Meaning |
|---|---|
| `no-root` | The document has no root element |
| `text-outside-root` | Text before or after the root element |
| `second-root` | A second root element |
| `unexpected-end` | A tag that is not finished: the text ends inside it, or an end tag holds more than its name |
| `invalid-name` | A name was expected (for example `< scene>`) |
| `uppercase-name` | A name uses upper-case letters |
| `unquoted-value` | An attribute value without quotes |
| `unclosed-value` | An attribute value whose closing quote is missing |
| `duplicate-attribute` | An attribute given twice on one element |
| `missing-space` | No whitespace where a tag needs it: two attributes with none between them, or a character a name cannot have |
| `stray-slash` | A `/` in a tag that is not followed by `>` |
| `unclosed-element` | An element still open at the end of the text |
| `mismatched-end-tag` | An end tag that does not match the open element |
| `stray-end-tag` | An end tag with no element open |
| `bad-character-reference` | An `&` that is not a known character reference |
| `unclosed-comment` | A comment with no `-->` |
| `bad-comment` | A comment that contains `--` |
| `unsupported-markup` | `<!...>` or `<?...?>` other than a comment |
| `less-than-in-value` | A `<` inside an attribute value |
| `null-character` | The null character, in text, in a value, or in a comment |
| `too-deep` | An element nested more than 256 deep |

### Where a syntax error is reported

A reader reads a page from its start, and the error it reports is the
first rule below that the text breaks as it is read; its place is a
line and a column, as above. The conformance samples hold readers to
these places.

Outside the root element, before it and after it:

- An end tag (`</`) is a `stray-end-tag`, at its `<`.
- After the root, another element is a `second-root`, at its `<`.
- Anything else that is not whitespace or a comment is
  `text-outside-root`, at its first character.
- Where the text ends and there was no root, the error is `no-root`, at
  the end of the text: the place after its last character.

An element, from its `<`:

- An element that would be the 257th deep is `too-deep`, at its `<`,
  whatever follows.
- `<!` that does not begin a comment (`<!--`), and `<?`, are
  `unsupported-markup`, at the `<`.
- Where a name begins (after `<`, after `</`, and where an attribute
  begins), a character that is not a letter is an `invalid-name`, at
  that character; a comment inside a tag is one, at its `<`. A name runs
  to the first character that is not a letter, a digit, or `-`; a name
  with an upper-case letter in it is an `uppercase-name`, at the name's
  first character.
- After the element's name, and after each attribute, come whitespace,
  `>`, or `/`. Any other character is a `missing-space`, at that
  character.
- After whitespace comes an attribute: its name, and optionally `=` and
  a value, with whitespace allowed on both sides of the `=`. A name the
  tag already has is a `duplicate-attribute`, at the later name's first
  character. After the `=`, a character that is not a quote is an
  `unquoted-value`, at that character.
- A `/` that is not followed at once by `>` is a `stray-slash`, at the
  `/`.
- Where the text ends inside a tag, the error is `unexpected-end`, at
  the tag's `<`, whatever was to come next: a name, a value after `=`,
  or the `>` after `/`. Inside a value it is `unclosed-value`, below.

A value, from its opening quote to the same quote again:

- A `<` is a `less-than-in-value`, at the `<`. But where a line end
  stands between the opening quote and that `<`, the closing quote is
  taken to be missing, which is what such a `<` nearly always means, and
  the error is `unclosed-value`, at the opening quote. A line end
  written as a character reference is not one.
- Where the text ends before the closing quote, the error is
  `unclosed-value`, at the opening quote.

An end tag, `</` and a name, then optional whitespace, then `>`:

- Anything else between the name and the `>`, the end of the text
  included, is an `unexpected-end`, at the end tag's `<`.
- Then, a name that is not the open element's is a
  `mismatched-end-tag`, at the end tag's `<`.

Content, text, and comments:

- Where the text ends while an element is open, the error is
  `unclosed-element`, at the `<` of the innermost element still open.
- A character reference is `&`, then one of the five names, or `#` and 1
  to 7 decimal digits, or `#x` and 1 to 6 hexadecimal digits, then `;`.
  The number is a Unicode scalar value other than 0: 1 to D7FF or E000
  to 10FFFF, in hexadecimal. Any other `&`, in text or in a value, is a
  `bad-character-reference`, at the `&`.
- A comment is `<!--`, its text, and the first `-->` after that. With no
  `-->` it is an `unclosed-comment`; otherwise, with `--` in its text,
  it is a `bad-comment`; both at the comment's `<`.
- A null character in text, in a value, or in a comment (one that is
  closed and has no `--`) is a `null-character`, at that character.
  Anywhere else it is the error any other character would be in its
  place: `text-outside-root`, `invalid-name`, or `missing-space`.

In the tree a reader gives for a page that has no error, the place of
an element is its `<`; of an attribute, the first character of its
name; and of text, its first character, whitespace included: the one
after the `>` or the `-->` before it.

## 6. Space, units, and values

- Distances are in metres, angles in degrees, and times in seconds or
  milliseconds.
- Space is right-handed with y up, as in glTF: x to the right, y up, and
  z toward the viewer's starting side. The floor is y = 0.
- Every element with a place (`group`, `model`, `label`, and a light's
  position) is placed in its parent's space: position, then rotation,
  then scale, as in glTF.
- A rotation `"x y z"` is three angles about the x, y, and z axes,
  combined in that order, as CSS's `rotateX() rotateY() rotateZ()` and
  Three.js's default order. Turning a model to face another way is
  usually just the middle number: `rotation="0 90 0"`.

Kinds of value used below:

| Kind | Written as | Examples |
|---|---|---|
| text | any characters; not empty, and not whitespace alone, unless its attribute says it may be | `"The HoloML Authors"` |
| number | a decimal number: an optional `-`, then digits with an optional `.` and more digits, or `.` and digits; optionally with an exponent (`e` or `E`, an optional `+` or `-`, and digits). No `+` before it, and no other form | `0.4`, `-2`, `.5`, `1.`, `1e3` |
| vector | three numbers separated by whitespace | `"0 1.6 6"` |
| scale | one number (the same on every axis) or three | `"1.2"`, `"1 2 1"` |
| colour | `#` and 3 or 6 hexadecimal digits, in either case | `"#fff"`, `"#c0182a"` |
| time | a number more than 0, written without a sign, followed at once by `s` or `ms` | `"20s"`, `"500ms"`, `"1.5e3ms"` |
| id | a letter (A to Z or a to z), then such letters, digits, `-`, or `_` | `"coupe"` |
| id reference | `#` and an id in the same document | `"#coupe"` |
| address | a relative address, or an `http:` or `https:` address, with no spaces or control characters | `"models/coupe.glb"`, `"game.js"` |
| flag | the attribute's name alone | `autoplay` |
| tiling | (0.2) one number more than 0 (the same both ways) or two | `"3"`, `"3 2"` |
| area | (0.2) four numbers, x0 z0 x1 z1, with x1 more than x0 and z1 more than z0: a rectangle of the ground, in metres | `"-6 -4 6 4"` |

Numbers MUST be finite: one too large to represent as a
double-precision number (such as `1e999`) is a `bad-value`, and so is a
time with such a number, and a count of repeats too large to count
exactly (more than 9007199254740991). A number too small to tell from 0
(such as `1e-999`) is 0.

Whitespace (section 5) around a number, a vector, a scale, a colour, a
time, a tiling, an area, a count of repeats, or an address is ignored,
and one or more whitespace characters separate the numbers of a vector,
a scale, a tiling, or an area. Only whitespace does: another space,
such as the no-break space (U+00A0), in its place is a `bad-value`. An
id, an id reference, a choice (such as a light's `type`), and the
version are written exactly, and whitespace around them is a
`bad-value`. Text is kept as it is written. It MUST NOT be empty or
whitespace alone, except where its attribute says it may be (the
`content` of `meta`). A flag has no value: a flag written with one,
even an empty one (`autoplay=""`), is a `bad-value`, and so is any other
attribute written alone, without a value.

Relative addresses are resolved against the page's own address, as in
HTML [URL]. A page MUST NOT use other schemes (`javascript:`, `data:`,
`file:`, and so on): an address that begins with a scheme (a letter,
then letters, digits, `+`, `.`, or `-`, and then `:`) other than `http`
or `https`, in either case, is an `unsafe-link`. An address MUST NOT be
empty, and MUST NOT contain a control character (U+0000 to U+001F and
U+007F to U+009F), a space or another of Unicode's separators (its
general category Z, which has the no-break space), or U+FEFF. URL
parsers drop some of these and rewrite others, so that an address with
one might not be the address it looks to be; it is a `bad-value`. An
address of a file of one kind (a model, a script, a sound, a picture)
ends with one of that kind's extensions, in either case, before any `?`
or `#`.

## 7. Elements

### `holoml`

The root element. It holds an optional `head`, then one `scene`.

```holoml
<holoml version="0.1">
  <scene />
</holoml>
```

| Attribute | Value | Meaning |
|---|---|---|
| `version` | `"0.1"`, `"0.2"`, or `"0.3"` (required) | The HoloML version the page is written for ([section 11](#11-versions)) |
| `lang` | language tag | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

### `head`

Information about the page. Holds at most one `title`, any number of
`meta`, and (0.2) any number of `script`. It has no attributes.

```holoml-head
<title>A showroom</title>
<meta name="description" content="Three cars you can walk around." />
```

### `title`

The page's title, shown in the browser's tab and history. Holds text
only.

| Attribute | Value | Meaning |
|---|---|---|
| `lang` | language tag | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

```holoml-head
<title>A showroom</title>
```

### `meta`

A named piece of information about the page, as in HTML. Holds nothing.

| Attribute | Value | Meaning |
|---|---|---|
| `name` | text (required) | What it is, for example `description` or `author` |
| `content` | text, which may be empty (required) | Its value |

```holoml-head
<meta name="author" content="The HoloML Authors" />
```

### `script`

(0.2) A JavaScript module that makes the page react: to clicks and keys,
to time passing, to the viewer walking about ([section
10](#10-scripts-and-the-scene-api)). Only in `head`; holds nothing, as
the script is always a file of its own. A renderer MUST run the page's
scripts in document order after it has built the scene, and only from
the page's own site.

| Attribute | Value | Meaning |
|---|---|---|
| `src` | address (required) | The script: a `.js` or `.mjs` file from the page's own site |

```holoml-head
<title>Blockworld</title>
<script src="game.js" />
```

### `scene`

Everything that is shown. Holds `group`, `model`, `light`, `label`, `a`,
`animate`, and (0.2) `sound`, `panel`, `hud`, `slider`, and `choice`, in
any order and number, at most one `viewpoint` ((0.2) several, as places;
see `viewpoint`), and (0.2) at most one `plan` and one `water`.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | (0.2) A name, so that `animate` or a script can change the background |
| `background` | colour | the renderer's | The colour behind everything |
| `environment` | address | none | (0.2) A panorama of the surroundings (an HDR, PNG, or JPEG picture, from the page's own site) that lights the scene: shiny and soft materials alike take their light and reflections from it. Without it, the renderer's own soft light. Its brightness follows the ambient lights (see `light`) |
| `sky` | address | none | (0.2) A panorama (an HDR, PNG, or JPEG picture, from the page's own site) drawn behind everything, in place of the background colour: the view out of the windows, or the sky over a field. Its brightness follows the ambient lights, as the surroundings' light does. It may be the same file as `environment` |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

```holoml
<holoml version="0.1">
  <scene background="#0b0f1e">
    <model src="models/coupe.glb" />
  </scene>
</holoml>
```

```holoml
<holoml version="0.2">
  <scene sky="light/harbour.jpg" environment="light/harbour.hdr">
    <model src="models/loft.glb" />
  </scene>
</holoml>
```

### `group`

Places several things together, so they move, turn, and scale as one.
Holds the same elements as `scene`, except `viewpoint`, `hud`, `slider`,
`choice`, `plan`, and `water`.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, so that `animate` can refer to it |
| `position` | vector | `"0 0 0"` | Where it is, in its parent's space |
| `rotation` | vector | `"0 0 0"` | How it is turned |
| `scale` | scale | `"1"` | How much bigger or smaller |
| `solid` | flag | off | (0.2) The walker cannot pass through any model in it (see "Walls and gravity") |
| `shadows` | flag | off | (0.2) Every model in it casts and receives shadows (see "Shadows") |
| `load` | `page` or `near` | `page` | (0.2) When its models load: with the page, or only while the viewer is near (see "Loading by area") |
| `near` | number, more than 0 | `10` | (0.2) With `load="near"`: how near, in metres, the viewer comes for its models to load |
| `label` | text | none | (0.3) Its name, heard by screen readers and shown in the text view |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

```holoml-scene
<group id="stand" position="0 0.5 0" rotation="0 45 0">
  <model src="models/stand.glb" />
  <label position="0 2 0">The stand</label>
</group>
```

### `model`

A 3D model from a glTF 2.0 file. Holds any number of `material`.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `src` | address (required) | | The `.gltf` or `.glb` file |
| `id` | id | none | A name, for `animate` |
| `position` | vector | `"0 0 0"` | Where it is |
| `rotation` | vector | `"0 0 0"` | How it is turned |
| `scale` | scale | `"1"` | How much bigger or smaller |
| `animation` | text | none | The name of one of the model's own glTF animations |
| `autoplay` | flag | off | Play that animation, repeating, from when the scene is shown |
| `solid` | flag | off | (0.2) The walker cannot pass through it (see "Walls and gravity") |
| `shadows` | flag | off | (0.2) It casts and receives shadows (see "Shadows") |
| `stand-in` | address | none | (0.2) A lighter model shown in its place until it has loaded, and again once it is let go (see "Loading by area") |
| `label` | text | none | (0.3) Its name, heard by screen readers and shown in the text view; without it, its `id`, then its file's name |
| `far` | address | none | (0.3) A lighter model shown in its place from `far-from` metres away (see [A lighter model far away](#a-lighter-model-far-away)) |
| `far-from` | number, more than 0 | none | (0.3) The distance, in metres from the viewer, from which `far` is shown |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

With `animation` and no `autoplay`, the model is shown in the first
frame of that animation (a pose). When the viewer asked for reduced
motion, a renderer MUST hold a model's own animation at its first frame
in the same way, `autoplay` or not, and whatever speed a script gives
it. A renderer that cannot load the file MUST show the rest of the
scene, and SHOULD mark where the model would be.

```holoml-scene
<model src="models/robot.glb" animation="Wave" autoplay />
```

### `material`

Changes one material inside its parent model, named as in the glTF file
(for example the car's `Paint`). Only the attributes given change. Holds
nothing.

| Attribute | Value | Meaning |
|---|---|---|
| `name` | text (required) | The material's name in the glTF file |
| `color` | colour | Its base colour |
| `metalness` | number from 0 to 1 | 0 is not metal, 1 is metal |
| `roughness` | number from 0 to 1 | 0 is mirror-smooth, 1 is fully rough |
| `opacity` | number from 0 to 1 | 0 is invisible, 1 is solid |
| `map` | address | (0.2) A colour picture (PNG, JPEG, or WebP), such as a fabric's weave |
| `normal-map` | address | (0.2) A picture of fine bumps (a tangent-space normal map, as glTF's) |
| `roughness-map` | address | (0.2) A picture of how rough each point is (its green channel, as glTF's) |
| `repeat` | tiling | (0.2) How many times the pictures tile across the model's own texture coordinates, such as `"3 2"`; default `"1"` |

A name that matches no material in the model changes nothing. (0.2)
Pictures come from the page's own site, like models, and count toward
the renderer's limits; `color` multiplies the colour picture. A picture
given here takes the place of the model's own.

A material that takes no light (glTF's KHR_materials_unlit) is changed
like any other in what it has: its `color`, its `opacity`, and (0.2)
its colour picture (`map`, with `repeat`). It has no metalness,
roughness, or bumps, so those attributes change nothing in it. The same
holds for an `option` and for a script's `material()`.

```holoml-scene
<model src="models/coupe.glb">
  <material name="Paint" color="#c0182a" metalness="0.8" roughness="0.3" />
  <material name="Glass" opacity="0.25" />
</model>
<model src="models/sofa.glb">
  <material name="Fabric" map="textures/linen.jpg" normal-map="textures/linen-normal.jpg" repeat="4 3" />
</model>
```

### `viewpoint`

Where the viewer starts, and how they move. Directly in `scene`; holds
nothing. In 0.1 a scene has at most one.

(0.2) A scene may have several: places the viewer can go. Each then
has an `id`, and the page's address can name one after `#`
(`loft.holoml#kitchen`): the viewer starts there, and at the first
viewpoint when the address names none, or one the page does not have.
The viewpoint the viewer starts at says how they move (`mode`,
`gravity`, `jump`, `crosshair`, and the speeds); the others are places,
with a position and a direction to look. A renderer MUST let the viewer
go to each place, for example from a list that the keyboard and screen
readers reach, named by `label`, and MUST go to the place that a link to
`#name` on the same page names. How it goes there is the renderer's
choice: it MAY fade out and in, as between pages (see `a`), and cuts
when the viewer asked for reduced motion.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | (0.2) Its name, for the page's address (`#kitchen`) |
| `label` | text | its id | (0.2) Its name in a list of places, such as "Kitchen" |
| `position` | vector | `"0 1.6 5"` | Where the viewer's eyes start |
| `look-at` | vector | `"0 1 0"` | The point they look at |
| `mode` | `orbit` or `walk` | `orbit` | How they move |
| `gravity` | flag | off | (0.2) Walk only: the walker falls, and stands on solid things or on the floor |
| `jump` | flag | off | (0.2) Walk with gravity: the Space key jumps, about 1.2 m up |
| `crosshair` | flag | off | (0.2) A small cross in the middle of the view, for aiming with the keyboard (section 10, `holoml.aim()`) |
| `speed` | number, 0.5 to 10 | `2.2` | (0.2) Walk only: how fast the viewer walks, in metres a second. A renderer's key for running (HyperSpace 3D: Shift) goes faster than this |
| `turn-speed` | number, 10 to 720 | `90` | (0.2) Walk only: how fast the viewer turns, and looks up and down, from the keyboard, in degrees a second |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

- `orbit`: the viewer circles the `look-at` point: drag to go around it,
  scroll or pinch to come closer or move away.
- `walk`: the viewer walks on the floor at the height of `position`:
  keys walk forward and back, step to either side, and turn, and
  dragging looks around. Which keys they are is the renderer's choice.
  A script can change the speeds while the page is open
  (`holoml.viewer.speed` and `turnSpeed`, section 10).

*Note (non-normative):* in HyperSpace 3D, W and S or the up and down
arrows walk, A and D step to the side, the left and right arrows turn,
Page Up and Page Down look up and down, and Shift runs.

Renderers SHOULD also offer keyboard and touch equivalents, including
turning and looking up and down from the keyboard, so that a page with
a `crosshair` can be used without a mouse.

```holoml-each
<viewpoint position="0 1.6 6" look-at="0 0.8 0" mode="orbit" />
<viewpoint position="0 12 4" look-at="0 10 0" mode="walk" gravity jump crosshair />
<viewpoint position="0 1.6 8" mode="walk" speed="4.3" turn-speed="120" />
<viewpoint id="hall" label="Hall" position="0 1.6 4" look-at="0 1.5 0" mode="walk" gravity />
<viewpoint id="kitchen" label="Kitchen" position="3 1.6 1" look-at="3 1.5 -2" />
```

### Walls and gravity

(0.2) The walker is a body 0.6 m wide and 1.8 m tall, with its eyes
1.6 m above its feet; `position` is where the eyes start. It cannot move
into a model marked `solid`, or a model in a group marked `solid`: each
such model stops it at its bounding box (the smallest box, lined up with
x, y, and z, that holds it). A walker that starts inside a solid model
can walk out of it.

Without `gravity`, the eyes stay at the starting height, as in 0.1, and
solid models still stop the walker. With `gravity`, the walker falls
(9.8 m/s²) until it stands on a solid model or on the floor (y = 0), and
climbs onto things only by jumping (with `jump`).

```holoml-scene
<viewpoint position="0 1.6 8" mode="walk" gravity jump />
<group solid>
  <model src="models/wall.glb" position="0 0 -4" />
  <model src="models/crate.glb" position="2 0 0" />
</group>
```

### `light`

A light. Holds nothing. If a scene has no light, a renderer SHOULD light
it softly so that models are still visible.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `type` | `ambient`, `directional`, `point`, or `spot` (required) | | The kind of light |
| `id` | id | none | A name |
| `color` | colour | `"#ffffff"` | Its colour |
| `intensity` | number, 0 or more | `1` | How bright |
| `position` | vector | see below | Where it is (not for `ambient`) |
| `look-at` | vector | `"0 0 0"` | Where it points (`directional` and `spot` only) |
| `range` | number, 0 or more | `0` | How far it reaches, in metres; 0 is no limit (`point` and `spot` only) |
| `angle` | number from 0 to 90 | `30` | The angle from the centre of the beam to its edge, in degrees (`spot` only) |
| `shadows` | flag | off | (0.2) It casts shadows (`directional`, `point`, and `spot` only; see "Shadows") |

- `ambient` light lights everything evenly, from everywhere.
- `directional` light comes from far away in one direction, like the
  sun: from `position` (default `"0 10 10"`) toward `look-at`.
- `point` light shines in every direction from `position` (default
  `"0 3 0"`), like a bulb.
- `spot` light shines a cone from `position` (default `"0 3 0"`) toward
  `look-at`.
- (0.2) The light from the surroundings (the scene's `environment`, or
  the renderer's own soft light without it) dims with the page's
  ambient lights: when their intensities add up to less than 0.6, it is
  that much dimmer (at 0.3, half as bright), so a page makes evening or
  night by dimming its ambient lights. Without ambient lights it is at
  full. The ambient lights that count are those in the scene at the
  time: one a script adds counts, and one it removes no longer does, so
  that a scene whose ambient lights have all been removed is at full
  again.

```holoml-scene
<light type="ambient" intensity="0.4" />
<light type="spot" position="0 5 0" look-at="0 0 0" angle="30" range="10" />
```

### Shadows

(0.2) A light marked `shadows` casts shadows from the models marked
`shadows` (on the model, or on a group around it) onto the models
marked `shadows`: a marked model both casts and receives them. A
renderer MAY choose how soft and how detailed shadows are, and MAY leave
them out when it has to (for example on a machine that draws in software,
or at its limits); it then SHOULD say so where the page's author can see
it (such as the console). Nothing else depends on them: a page means the
same without its shadows.

```holoml-scene
<light type="directional" position="3 6 4" look-at="0 0 0" shadows />
<group shadows>
  <model src="models/floor.glb" />
  <model src="models/sofa.glb" />
</group>
```

### `water`

(0.2) A box of water, such as a tank, a pool, or a stretch of sea. It
stands in `scene`, at most one; holds nothing.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | (0.3) A name, for scripts to change it |
| `position` | vector | `"0 0 0"` | The middle of the water's floor |
| `size` | three numbers more than 0 (required) | | Its width (x), height (y), and depth (z), in metres; its top is the surface |
| `color` | colour | `"#1f6f8b"` | The colour that things seen through the water fade into |
| `clarity` | number, more than 0 | `15` | How far one can see through it, in metres |
| `caustics` | flag | off | The moving net of light that the waves on the surface cast on everything below it |

- What is seen through the water fades into its colour with how far the
  view travels through it, evenly: a thing `clarity` metres into the
  water has faded fully, and one half as far has half faded. From inside
  the water that is the whole way to the thing; from outside, only the
  part of the way inside the box, as when looking into a tank through
  its glass. The background and the sky do not fade, and neither do
  labels and panels: text stays as it is, to be read.
- With `caustics`, the light plays over what is in the water, most on
  what faces up to the surface (floors, rocks, the backs of fish), and
  fainter the deeper it is. It moves; with reduced motion it holds
  still. A renderer MAY leave it out when it has to (for example on a
  machine that draws in software); it then SHOULD say so where the
  page's author can see it (such as the console), as with shadows.
- The water is not solid and has no weight: the walker is stopped by the
  page's own models (a tank's glass), not by the water, and sounds and
  gravity are as they are elsewhere.

```holoml-scene
<water position="0 0 -6" size="16 6 24" color="#1f6f8b" clarity="14" caustics />
```

### Loading by area

(0.2) A large scene can load its models where the viewer goes. A
`group` with `load="near"` loads its models, and their pictures, only
while the viewer's eyes are within `near` metres (10 by default) of the
group's place (its position in the scene), and lets them go when the
viewer is farther than half as much again (15 metres by default), so
that walking along the edge does not load them and let them go again
and again. A group within reach of where the viewer starts loads with
the page, and the page is ready (section 10, `holoml.ready`) once those
have loaded; one farther away loads when the viewer comes near. A model
in several such groups loads while the viewer is near every one of
them.

A group's models count toward a renderer's limits ([section
9](#9-processing-model), "Limits") only while they are loaded: a
renderer SHOULD release them when it lets them go, and MAY wait to load
a group that would pass a limit until others are let go. A script can
tell whether a group's models are in (`loaded`) and hear them come and
go (the `load` event, section 10).

A model's `stand-in` is a lighter model from the page's own site, such
as a copy with fewer triangles and smaller pictures: it is shown in the
model's place, turned and sized as the model, until the model has
loaded, and again once the model is let go. It loads with its page and
counts toward the limits like any model. While it stands in, it is
solid and casts shadows if the model is, and a click on it is a click
on the model; the model's own `material` changes apply to the model
only.

```holoml-scene
<group load="near" near="6" position="-4 0 0">
  <model src="models/shoe.glb" stand-in="models/shoe-far.glb" position="0 1 0" />
</group>
```

### A lighter model far away

(0.3) A model with `far` and `far-from` (each needs the other) is drawn
from the lighter file in `far` while the viewer is `far-from` metres
or more from the model's place, and from its own file when nearer. The
distance is measured from the viewer's eyes to the model's `position`
in the scene, after the groups around it have moved and turned it.

- A renderer MUST NOT draw both at once, and SHOULD switch between them
  a little after the distance is crossed each way (so that standing at
  the line does not make it flicker).
- A renderer SHOULD load only the file it draws first, and the other
  when the viewer comes within reach of the line; what a renderer
  loads counts toward its limits (section 9, "Limits").
- The far model takes the model's place, turn, and size, its
  `material` changes, and what a click on the model does. It plays the
  model's `animation` if it has one of that name. It is solid and casts
  shadows if the model is.
- With loading by area, a model that is not yet loaded shows its
  `stand-in` as before; once loaded, its `far` model is shown when
  the viewer is far.
- Screen readers, the text view, and the outline of the scene hear of
  one model, whichever file is drawn.

```holoml-scene
<model src="fish/shark.glb" far="fish/shark-far.glb" far-from="20"
       label="Blacktip reef shark" position="0 2 -6" />
```

### `label`

Text in the scene. It always faces the viewer. Holds text only.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for `animate` |
| `position` | vector | `"0 0 0"` | Where its centre is |
| `size` | number, more than 0 | `0.2` | The height of a line of text, in metres |
| `color` | colour | the renderer's | The colour of the text |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

```holoml-scene
<label position="0 2.1 0" size="0.15">From $32,000</label>
```

### `panel`

(0.2) Text of more than one line on a flat board in the scene: an
information panel on a wall, a menu on a table. It is placed and turned
like a model, and does not turn to face the viewer. Holds text: its
lines wrap to `width`, and a blank line starts a new paragraph. It may
stand in `scene`, `group`, or `a`. A renderer SHOULD let Find in page,
screen readers, and any text-only view of the page read its words.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for a click action's `trigger` and for scripts |
| `position` | vector | `"0 0 0"` | Where its centre is |
| `rotation` | vector | `"0 0 0"` | How it is turned; unturned, its face looks along z, toward a viewer at a larger z |
| `width` | number, more than 0 | `1` | How wide it is, in metres; its lines wrap to this |
| `size` | number, more than 0 | `0.06` | The height of a line of text, in metres |
| `color` | colour | the renderer's | The colour of the text; by default one that reads well on the board, or on the scene's background without one |
| `background` | colour | none | The colour of the board behind the text; without it, the text alone |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

A panel is as tall as its text needs.

```holoml-scene
<panel position="3 1.5 -2.9" width="1.2" size="0.06" background="#f5f2eb">
  Kitchen, 14 m²

  Oak worktops, a gas hob, and a window onto the harbour.
</panel>
```

### `a`

A link, as in HTML. Everything inside it (models, groups, labels) opens
the address when clicked or tapped, or when the viewer moves to it with
the keyboard and presses Enter. Holds `model`, `group`, `label`, and
(0.2) `panel`. A link MUST NOT be inside another link.

(0.2) A link's address can name a place on the page it opens
(`terrace.holoml#door`; see `viewpoint`). Following a link to another
HoloML page of the same site, a renderer SHOULD move the viewer as
between rooms: a short fade out and in instead of a cut (a cut when
the viewer asked for reduced motion).

| Attribute | Value | Meaning |
|---|---|---|
| `href` | address (required) | Another HoloML page, or any web page |
| `lang` | language tag | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

A renderer SHOULD show which things are links, for example by the
pointer and a highlight.

```holoml-scene
<a href="coupe.holoml">
  <model src="models/coupe.glb" />
</a>
```

### `animate`

Changes the position, rotation, or scale of an element over time,
starting when the scene is shown; (0.2) also a light's brightness and
colour, and the scene's background. Holds nothing. It may stand in
`scene` or in `group`.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | (0.3) A name, for scripts to start and stop it |
| `target` | id reference (required) | | The element to change |
| `attribute` | `position`, `rotation`, or `scale`; (0.2) `intensity`, `color`, or `background` (required) | | What to change |
| `from` | as `to` | the target's own value | Where to start |
| `to` | a vector for `position`, `rotation`, and `scale`; a number, 0 or more, for `intensity`; a colour for `color` and `background` (required) | | Where to end |
| `duration` | time (required) | | How long one run takes |
| `repeat` | a whole number, 1 or more, or `indefinite` | `1` | How many runs |
| `begin` | `load` or `click` | `load` | (0.2) When it runs: when the scene is shown, or each time its trigger is clicked (see "Click actions") |
| `trigger` | id reference | its target | (0.2) With `begin="click"`: the element whose click runs it, a `model`, `group`, `label`, or `panel` |
| `toggle` | flag | off | (0.2) With `begin="click"`: each click runs it forward, and the next back, so that a door opens and closes |
| `label` | text | the trigger's id | (0.2) With `begin="click"`: its name for the keyboard and screen readers, such as "Bedroom door" |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

- The change is even over the duration; a colour changes its red,
  green, and blue evenly. Each repeat starts again at `from`; after the
  last one, the value stays at `to`.
- `position` can be animated on a `model`, `group`, or `label`, and
  (0.2) on a light that has a position; `rotation` and `scale` on a
  `model` or `group`; (0.2) `intensity` and `color` on a `light`, and
  `background` on the `scene` (give it an `id`).
- A turntable is a rotation from `0 0 0` to `0 360 0`, repeated
  indefinitely: the end and the start look the same, so it turns
  without a jump.
- If two `animate` elements change the same attribute of the same
  element, the later one in the document wins.
- When the viewer asked for reduced motion, a renderer MUST show an
  animation's end at once: the value at `to`, without the movement,
  whatever its `repeat`. It follows the viewer's wish when that changes
  while the page is open.

```holoml
<holoml version="0.2">
  <scene id="world">
    <model id="coupe" src="models/coupe.glb" />
    <light id="sun" type="directional" position="4 8 5" intensity="1.2" />
    <animate target="#coupe" attribute="rotation" from="0 0 0" to="0 360 0" duration="20s" repeat="indefinite" />
    <animate target="#sun" attribute="intensity" from="1.2" to="0.1" duration="60s" />
    <animate target="#world" attribute="background" to="#0b1030" duration="60s" />
  </scene>
</holoml>
```

### Click actions

(0.2) An `animate` or a `sound` with `begin="click"` is a click action:
it runs each time the viewer clicks its trigger (its `trigger`, or an
`animate`'s own target). With `toggle`, an animation runs forward on
one click and back on the next, from wherever it is; without it, each
click runs it again from `from`. A trigger may start several actions
at once, such as a door's swing and its creak. A click on something a
trigger holds (a model in a group) is a click on the trigger; where one
trigger holds another, the innermost runs. A renderer SHOULD show that a
trigger can be clicked (the pointer, a highlight), MUST make each
trigger's actions a control that the keyboard and screen readers reach
(named by its actions' `label`), and, when the viewer asked for reduced
motion, MUST show an action's end at once. Scripts still hear the click
(section 10).

```holoml-scene
<group id="door-hinge" position="1 0 0">
  <model id="bedroom-door" src="models/door.glb" position="0.45 0 0" solid />
</group>
<animate target="#door-hinge" attribute="rotation" to="0 90 0" duration="0.8s" begin="click" trigger="#bedroom-door" toggle label="Bedroom door" />
<sound src="sounds/door.ogg" begin="click" trigger="#bedroom-door" />
<light id="hall-lamp" type="point" position="0 2.4 0" intensity="0" />
<model id="hall-switch" src="models/switch.glb" position="-1 1.2 0" />
<animate target="#hall-lamp" attribute="intensity" from="0" to="1.2" duration="0.2s" begin="click" trigger="#hall-switch" toggle label="Hall light" />
```

### `sound`

(0.2) A sound from a file, played by a script (section 10) or with
`autoplay`. It may stand in `scene` or in `group`; holds nothing.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `src` | address (required) | | The sound: an `.ogg`, `.mp3`, or `.wav` file |
| `loop` | flag | off | Start again at the end, until stopped |
| `autoplay` | flag | off | Play as soon as sounds may play (below) |
| `volume` | number from 0 to 1 | `1` | How loud |
| `position` | vector | none | Where it comes from: with it, the sound comes from that place (below) |
| `range` | number, more than 0 | `20` | With `position`, and needing it: how far the sound reaches, in metres |
| `begin` | `load` or `click` | `load` | With `click`, it plays each time its trigger is clicked (see "Click actions"); such a sound has no `autoplay` |
| `trigger` | id reference | none | With `begin="click"`, and needed then: the element whose click plays it |
| `label` | text | the trigger's id | With `begin="click"`: its name for the keyboard and screen readers |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

A renderer MUST NOT play any sound before the viewer's first click,
tap, or key on the page: web pages may not start sounds on their own,
and neither may HoloML pages. `autoplay` sounds start then.

A sound without a `position` sounds the same wherever the viewer is. A
sound with a `position` (in its parent's space, so that a sound in a
group moves with the group) comes from that place: it plays at its
`volume` within 1 metre of the viewer, grows quieter evenly as the
viewer moves away, and is silent from `range` metres on; and it comes
from the viewer's left or right as the place is.

```holoml-scene
<sound id="birds" src="sounds/birds.ogg" loop autoplay volume="0.4" />
<sound id="pop" src="sounds/pop.wav" />
<sound id="bubbler" src="sounds/bubbles.ogg" position="2 0.3 -4" range="10" loop autoplay />
```

### `hud`

(0.2) Text fixed to a corner of the screen, in front of the scene: a
score, a hint, what the viewer carries. Holds text: each line of it is
a line on the screen. The text may be empty, for a script to fill in.
Only directly in `scene`. A renderer SHOULD let screen readers read it
and show it in any text-only view of the page.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-left` | Where on the screen |
| `size` | number, more than 0 | `18` | The height of its text, in CSS pixels |
| `color` | colour | the renderer's | The colour of the text |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

```holoml-scene
<hud id="score" corner="top-right">Gems: 0 of 5</hud>
<hud corner="bottom-left">
  Click a block to break it
  Right-click to place one
</hud>
```

### `slider`

(0.2) A number the viewer chooses, with a slider fixed to a corner of
the screen, in front of the scene: how fast to walk, how loud, how much.
Holds text: its label, which may not be empty. Only directly in `scene`.
A slider does nothing on its own: a page's script reads it (section 10,
the `change` event). A renderer MUST let the mouse, touch, and the
keyboard move it (the arrow keys, Home, End, Page Up, and Page Down,
while it has the keyboard), MUST let screen readers read and move it,
SHOULD show it in any text-only view of the page, and SHOULD stack it
with the corner's `hud` text, in page order.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-left` | Where on the screen |
| `min` | number | `0` | The smallest value |
| `max` | number, more than `min` | `1` | The largest value |
| `step` | number, more than 0 | a hundredth of the range | The steps between values |
| `value` | number, from `min` to `max` | `min` | The value at the start |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

```holoml-scene
<slider id="pace" corner="top-left" min="0.5" max="2" step="0.25" value="1">Speed</slider>
```

### `choice`

(0.2) A choice in place: options on the screen, fixed to a corner like
`hud` and `slider`, that change one of a model's materials, or, without
`target` and `material`, a choice for the page's scripts. Holds one or
more `option`. Only directly in `scene`. Picking an option changes the
material at once, as a `material` element would, without a new page or
a script; a material name the model does not have changes nothing (a
renderer MAY say so, as for `material`). At the start, the option
`value` names (by default the first) is chosen and applied. A renderer
MUST let the mouse, touch, the keyboard (as a group of radio buttons),
and screen readers pick an option, SHOULD show the choice in any
text-only view of the page, and MUST tell the page's scripts (the
`change` event, section 10).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-left` | Where on the screen |
| `label` | text | none | Its name on the screen, such as "Fabric" |
| `target` | id reference | none | The `model` whose material it changes (with `material`) |
| `material` | text | none | The name of that material in the model's glTF file (with `target`) |
| `value` | text | the first option's | The value of the option chosen at the start |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

```holoml-scene
<model id="sofa" src="models/sofa.glb" />
<choice id="fabric" corner="bottom-left" label="Fabric" target="#sofa" material="Fabric" value="linen">
  <option value="linen" map="textures/linen.jpg" repeat="4 3">Linen</option>
  <option value="velvet" color="#3b5d7a" roughness="0.6">Velvet</option>
</choice>
```

### `option`

(0.2) One option of a `choice`. Holds text: its label, which may not be
empty. Only directly in `choice`. Its other attributes are the
material's look when it is chosen, as in `material`: each option starts
from the material's own look and changes only what it gives.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `value` | text | its label | Its value, for the choice's `value` and for scripts; unique in its choice |
| `color` | colour | the material's | Its base colour |
| `metalness` | number from 0 to 1 | the material's | 0 is not metal, 1 is metal |
| `roughness` | number from 0 to 1 | the material's | 0 is mirror-smooth, 1 is fully rough |
| `opacity` | number from 0 to 1 | the material's | 0 is invisible, 1 is solid |
| `map` | address | the material's | A colour picture |
| `normal-map` | address | the material's | A picture of fine bumps |
| `roughness-map` | address | the material's | A picture of how rough each point is |
| `repeat` | tiling | `"1"` | How many times the pictures tile |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

```holoml-scene
<model id="armchair" src="models/armchair.glb" />
<choice target="#armchair" material="Cover" label="Cover">
  <option value="leather" map="textures/leather.jpg" roughness-map="textures/leather-rough.jpg" repeat="2">Brown leather</option>
</choice>
```

### `plan`

(0.2) A floor plan fixed to a corner of the screen, like `hud`, with a
marker for where the viewer is and which way they face. At most one,
directly in `scene`; holds nothing. `area` says which rectangle of the
ground the picture shows, seen from above: its left edge is at x0, its
right edge at x1, its top edge at z0, and its bottom edge at z1. The
marker is left out while the viewer is outside the area. A renderer
MUST give the picture its `label` for screen readers.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name. Nothing in 0.2 uses it: a plan is not one of the kinds of thing a script can find (section 10) |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-right` | Where on the screen |
| `src` | address (required) | | The picture: a PNG, JPEG, or WebP file from the page's own site |
| `area` | area (required) | | The rectangle of the ground the picture shows |
| `width` | number, more than 0 | `200` | How wide it is on the screen, in CSS pixels; its height follows the picture |
| `label` | text | `"Floor plan"` | Its name for screen readers |
| `lang` | language tag | from the element around it | (0.3) The language of its text, as in HTML; see [Language and direction](#language-and-direction) |
| `dir` | `ltr`, `rtl`, or `auto` | from the element around it | (0.3) The direction its text runs; see [Language and direction](#language-and-direction) |

```holoml-scene
<plan src="plans/loft.png" area="-6 -4 6 4" corner="top-right" width="220" label="Floor plan of the loft" />
```

### Language and direction

(0.3) `lang` says which language an element's text is in, and `dir`
which way it runs, as in HTML [HTML]:

- `lang` is a language tag [BCP47]: `en`, `ar`, `he`, `pt-BR`,
  `zh-Hant`. A checker checks its form only: letters, then parts of
  letters and digits after hyphens, none longer than eight.
- `dir` is `ltr` (left to right), `rtl` (right to left), or `auto`
  (the direction of the first letter that has one, by the Unicode
  Bidirectional Algorithm [UAX9]).
- Both may be written on `holoml`, `scene`, `group`, and `a`, and on
  every element that holds or shows text. An element without them takes
  them from the nearest element around it that has them, as in HTML. A
  page without them has text in no stated language, running left to
  right.
- They apply to the element's own text, and to the text of its
  `label` attribute (a model's, a group's, a place's, a sound's, a
  click action's, a choice's, or a plan's).
- A renderer MUST give the language to screen readers with the text,
  and MUST lay out and draw text of the direction `rtl` from right to
  left: a label's, a panel's lines, the screen's text, a slider's and a
  choice's labels, and their place in their corner. It SHOULD use fonts
  for the language where the viewer's system has them.

```holoml
<holoml version="0.3" lang="en">
  <scene>
    <label position="0 2 0">Welcome</label>
    <label position="0 1.5 0" lang="ar" dir="rtl">أهلاً وسهلاً</label>
    <label position="0 1 0" lang="he" dir="rtl">ברוכים הבאים</label>
  </scene>
</holoml>
```

## 8. Checking

A document that follows the syntax may still break the rules above. A
checker MUST report each problem with its code and its place, and a
renderer SHOULD show the rest of the scene as well as it can. A page is
checked against the version it declares: an element or attribute from a
later version is reported as unknown (`unknown-element`,
`unknown-attribute`), and a value from a later version (such as an
`animate` of `intensity` in a 0.1 page) as a `bad-value`. Nothing more
is reported of it: the later version's rules do not apply to the page,
so that a 0.1 page's `toggle` is an unknown attribute, and not also a
click action without its `begin`.

An `id` names its element wherever the element stands, even inside an
element that is unknown or that may not stand where it is: two elements
anywhere in the page with the same id are a `duplicate-id`, and a
reference to such an element is not an `unknown-target`. A reference to
an element that is unknown in the page's version is not reported again,
as the element already is. A reference that is not written as one (`#`
and an id) is a `bad-value` and nothing more.

The problem codes:

| Code | Meaning |
|---|---|
| `wrong-root` | The root element is not `holoml` |
| `unsupported-version` | The `version` is not one the reader knows, written exactly |
| `unknown-element` | An element that is not in the page's HoloML version |
| `child-not-allowed` | An element where it may not stand |
| `text-not-allowed` | Text in an element that holds none (text belongs in `title`, `label`, and (0.2) `hud`, `slider`, `option`, and `panel`) |
| `empty-text` | An element that holds text, with none (a `hud` may be empty) |
| `too-many` | A further `head`, `scene`, `title`, (0.1) `viewpoint`, or (0.2) `plan` or `water` |
| `missing-child` | `holoml` without a `scene`, or (0.2) a `choice` without an `option` |
| `wrong-order` | `head` after `scene` |
| `unknown-attribute` | An attribute the element does not have |
| `missing-attribute` | A required attribute is missing, or (0.2) one that another needs: a choice's `target` and `material` go together, a click action's `trigger`, `toggle`, and `label` need `begin="click"`, an animation that begins on a click needs a `trigger` when its target cannot be clicked, and a sound always does, each of several viewpoints needs an `id`, a group's `near` needs `load="near"`, and a sound's `range` needs a `position` |
| `bad-value` | A value of the wrong kind, or out of range, or (0.2) one that another attribute or element rules out: a slider's `max` and `value`, a toggle's `repeat`, a click sound's `autoplay`, an option's value that another has, a choice's `value` |
| `attribute-not-for-type` | A light attribute its type does not use |
| `duplicate-id` | Two elements with the same id |
| `unknown-target` | An id reference (an `animate` target, (0.2) a trigger, a choice's target) that no element has |
| `bad-target` | An attribute that cannot be animated on that element, or (0.2) a trigger that cannot be clicked, or a choice's target that is not a model |
| `nested-link` | A link inside another link |
| `unsafe-link` | An address with a scheme other than http or https |

### Where a problem is reported

The place of an element is its `<`; of an attribute, the first
character of its name; and of text, its first character that is not
whitespace, a character reference counting as one (section 5). A
checker lists problems in the order of their places in the page. Where
several are at one place, their order is not defined; no conformance
sample has two codes at one place.

What is checked, and where each problem is:

- `wrong-root` is at the root, and nothing else in the page is checked.
- A root without a `version` has a `missing-attribute`, at the root; a
  `version` that is not one the checker knows is an
  `unsupported-version`, at the attribute. In both cases the rest of
  the page is checked by the newest version the checker knows ([section
  11](#11-versions)).
- An element the page's version does not have is an `unknown-element`,
  at the element; one it has, where it may not stand, is a
  `child-not-allowed`, at the element. Neither is checked further: not
  its attributes, and not what it holds. In an element that holds text,
  every element is a `child-not-allowed`.
- `text-not-allowed` is at the text, for each text.
- `empty-text` is at the element. Text that is whitespace alone is
  none, however it is written.
- `too-many` is at each such element after the first: a third is
  reported as well as the second. (Before 0.3 this said that only the
  second was; it holds for every version.)
- `missing-child` is at the element that lacks the child, and
  `wrong-order` at the first `head`, when it comes after the first
  `scene`.
- `unknown-attribute`, `bad-value`, `attribute-not-for-type`, and
  `unsafe-link` are at the attribute. A value is reported once for its
  kind, by the first of its kind's rules that it breaks; for an
  address, its characters, then its scheme, then its file's extension.
  A light's attributes are held to its `type` only when the type is one
  of the four.
- A `bad-value` between attributes is at the attribute that is wrong: a
  slider's `max` that is not more than its `min` (at the slider itself
  when `max` is not written), and its `value` outside them; a toggle's
  `repeat` other than 1; a click sound's `autoplay`; a choice's `value`
  that is none of its options'. An option whose value another option of
  its choice has is reported at its `value`, or at the option when its
  label is its value. None of these is reported for a value that is
  already a `bad-value` by its kind.
- `missing-attribute` for a required attribute is at the element, once
  for each that is missing. For an attribute that needs another, it is
  at the attribute that is there: a group's `near`; a click action's
  `trigger`, `toggle`, or `label`; a sound's `range`. Otherwise it is
  at the element: a choice with only one of `target` and `material`, an
  animation or a sound that begins on a click and lacks the trigger it
  needs, and each viewpoint without an `id` in a scene with several.
- `duplicate-id` is at the later element's `id`.
- `unknown-target` and `bad-target` are at the attribute that refers:
  `target` or `trigger`.
- `nested-link` is at the inner link.

## 9. Processing model

This section follows a page from its text to what the viewer sees and
does. Most of its requirements are stated where the elements are
defined; this section gathers them, and adds what was left unsaid.

### Reading and checking

A reader decodes the page as UTF-8 and reads it as section 5 says,
stopping at the first syntax error. It then checks the page against the
version the page declares ([section 11](#11-versions)) and the rules of
section 8. A renderer shows a page with problems as well as it can,
leaving out what it cannot show; a page whose version it does not know
it does not draw at all (section 11). What the page's version does not
have is one of those problems, and a renderer MUST NOT act on it as a
later version would: a `hud` in a 0.1 page is not shown, as a `slider`
in one is not.

### Building the scene

A renderer builds the scene from the page's elements in document order:
each element with a place is placed in its parent's space (section 6),
materials change their models, and animations, click actions, places,
and what is fixed to the screen are set up as section 7 says. Then it
runs a 0.2 page's scripts ([section 10](#10-scripts-and-the-scene-api)).

### Loading

A renderer loads the page's models, their pictures, and (0.2) its
sounds, pictures, surroundings, sky, and plan, from their addresses:
scripts, sounds, and pictures only from the page's own site ([section
12](#12-security-considerations)). A file that cannot be loaded is left
out, and the rest of the scene is shown. The page is ready when every
file it loads with the page has loaded or been left out (section 10,
`holoml.ready`): its models and their stand-ins, its sounds, and its
pictures, which are those of materials and options, the surroundings,
the sky, and the plan. What a group that loads by area holds counts
only when the group is within reach of where the viewer starts (section
7, "Loading by area").

(Clarified) A renderer MUST read a model's file as the glTF 2.0
specification defines [GLTF]. A glTF file may use extensions, which it
lists in `extensionsUsed`, and may need some of them, which it lists in
`extensionsRequired`. A renderer MAY support any extensions. A model
whose file needs an extension the renderer does not support is left
out, as a model whose file cannot be loaded; an extension that a file
uses but does not need MAY be ignored.

*Note (non-normative):* HyperSpace 3D reads KHR_lights_punctual,
KHR_materials_anisotropy, KHR_materials_clearcoat,
KHR_materials_dispersion, KHR_materials_emissive_strength,
KHR_materials_ior, KHR_materials_iridescence, KHR_materials_sheen,
KHR_materials_specular, KHR_materials_transmission,
KHR_materials_unlit, KHR_materials_volume, KHR_mesh_quantization,
KHR_texture_transform, EXT_materials_bump, EXT_mesh_gpu_instancing,
EXT_texture_avif, EXT_texture_webp, and (since its milestone 25, with
three.js's decoders, carried in the browser) compressed geometry
(KHR_draco_mesh_compression, EXT_meshopt_compression, and
KHR_meshopt_compression) and compressed pictures (KHR_texture_basisu).

### Limits

A renderer MAY set limits on what one page can use, so that a heavy or
hostile page cannot exhaust the viewer's memory or freeze the renderer:
for example the size of the page's text, the number of elements, the
number and size of model files, the size of pictures inside models, the
number of triangles, what the files become once they are decoded (the
pixels of pictures, the seconds of sound), the number of lights, and how
far from the middle of the scene a thing may be. When a page goes past a limit, the renderer
SHOULD show as much of the scene as it can, leave out what crossed the
limit, and tell the viewer what was left out and why. Limits do not make
a page invalid: a valid page stays valid whatever a renderer's limits
are.

(0.3, for every version) So that a page that keeps within them works in
every renderer, a renderer MUST show a page whole that uses no more than
these, and MAY allow more:

| What | At least |
|---|---|
| The page's text | 1 MB (1,048,576 bytes) |
| Elements | 5,000 |
| Model files (a file used by many models counts once) | 32 |
| One model or sound file | 16 MB |
| All model and sound files together | 64 MB |
| One picture, in a model or a material | 2048 by 2048 pixels |
| All pictures together, once decoded | 33,554,432 pixels (eight pictures of 2048 by 2048) |
| Triangles, as drawn, once the models are decoded | 1,000,000 |
| Sound, once decoded | 300 seconds |
| Lights that shine from a place or a direction, those in model files included | 8, of which 2 cast shadows |
| Places, sizes, and scales | within 100,000 (metres, or times) |
| Time for one file to load, before the renderer gives up on it | 30 seconds |

A renderer SHOULD show a page within these, once its files are in, in 5
seconds or less on a computer with a graphics card, and MUST NOT hold
the viewer's browser or other pages while it prepares it. Scripts have
their own limits (section 10, "Limits for scripts").

*Note (non-normative):* HyperSol HyperSpace 3D allows per page 2 MB of
text, 10,000 elements, 64 model files (a file used by many models is
loaded once), 32 MB for one model or sound file and 128 MB for all of
them, pictures up to 4096 by 4096 pixels and 134,217,728 pixels of
pictures in all once decoded, 2 million triangles in all (counted as
drawn, once a model is decoded), 600 seconds of sound in all, 32 lights
that shine from a place or a direction (those in model files included),
of which the first 4 that ask cast shadows, places, sizes, and scales
within 1,000,000, and 30 seconds for a file to load.

### Drawing

A renderer draws the scene from the viewer's eyes, with its lights,
materials, animations, (0.2) shadows, water, and sky, as section 7 says.
While a 0.2 page's scripts listen for frames, it keeps drawing, except
while the page cannot be seen (section 10, the `frame` event). A
renderer need not draw while nothing in the scene changes.

The look, so that two renderers draw a page alike (written down in 0.3,
and true of every version):

- **Colour.** Colours in the page and in pictures are sRGB. A renderer
  lights the scene in linear light and turns the result into the
  screen's colours with the ACES filmic tone curve [ACES] at an
  exposure of 1, then into sRGB.
- **Lights.** A `directional`, `point`, or `spot` light of
  `intensity` 1 lights a surface facing it with an illuminance of 2
  (in the units in which a white surface that scatters light evenly,
  lit by an illuminance E, sends out E divided by pi); `ambient` light
  of `intensity` 1 lights every surface with an illuminance of 1 from
  every side. Point and spot lights do not grow dimmer with distance:
  they light evenly to their `range`, and nothing beyond it. A spot's
  light fades over the outer quarter of its `angle`.
- **Without lights.** A scene with no `light` is lit as if it had an
  `ambient` light of `intensity` 0.6 and a `directional` light of
  `intensity` 0.7 from `"3 10 6"` toward `"0 0 0"`.
- **The light from around.** Without an `environment`, a renderer
  lights shiny and soft surfaces with light from a plain, softly lit
  room around the scene, at 0.45 of its full strength; with one, the
  panorama at full strength. Both then follow the ambient lights, as
  `light` says.
- **The eyes.** The viewer's view is 50 degrees from top to bottom,
  and as wide as the page's window makes it. A renderer MAY leave out
  what is nearer than 0.05 metres to the eyes, or farther than 2,000.

*Note (non-normative):* Where Chromium draws in software (a computer
without a graphics card), HyperSpace 3D draws the scene with half as
many pixels each way and without smoothed edges, and leaves out shadows
and the water's moving light; it says so in the console.

### Interacting

The viewer moves as the starting viewpoint says (orbit or walk, and
(0.2) walls and gravity). A click or a tap follows a link (`a`) or runs
a trigger's click actions, and (0.2) a page's scripts hear clicks and
keys (section 10). Where one click does several of these, they come in
this order: first the page's scripts are told (the `click` event, for
any button), then the trigger's click actions run, then the link is
followed; the last two for the main button or a tap only. A renderer's
outline gives the keyboard and screen readers the page's links, named
things, places, and click actions
([section 14](#14-accessibility-considerations)).

### Leaving a page

Following a link opens its address: another HoloML page, or any web
page. (0.2) Between HoloML pages of the same site, a renderer SHOULD
fade out and in (section 7, `a`). A page's scripts end with the page.

## 10. Scripts and the scene API

(0.2) A page's scripts (`script` in `head`) are JavaScript modules from
the page's own site. They may import other modules from that site. A
renderer MUST run them after it has built the scene from the page, in
document order, and give them one object, `holoml`, to read and change
the scene. Everything else is ordinary web JavaScript: timers, and
`fetch` from the page's own site; nothing that a renderer would not
allow a web page. Appendix A.3 gives the scene API in Web IDL [WEBIDL].

```js
// sign.js
const sign = holoml.find('sign');
holoml.on('click', (e) => {
  if (e.thing?.id === 'lamp') {
    const lamp = holoml.find('lamp-light');
    lamp.intensity = lamp.intensity > 0 ? 0 : 1.5;
    sign.text = lamp.intensity > 0 ? 'The lamp is on' : 'The lamp is off';
  }
});
```

### The `holoml` object

| Member | What it is |
|---|---|
| `holoml.version` | The version the page declares, such as `"0.2"` |
| `holoml.ready` | A promise, kept when the page is ready: when every file it loads with the page (models, sounds, and pictures; section 9, "Loading") has loaded or been left out |
| `holoml.find(id)` | The element with this id, as a thing (below), or `null`: when no element has the id, and when the element is not of a kind that is a thing (the scene, a viewpoint; before 0.3, a plan) |
| `holoml.add(markup, parent)` | Adds elements written in HoloML to the scene, or into the group thing `parent`. The markup's own elements are `group`, `model`, `light`, `label`, and `sound`; a group in it holds what a page's group holds. Returns the new things, one for each of the markup's own elements that was added. The markup is checked like a page of the page's version: an element with a problem is left out, and the console says why. So is any other element written as the markup's own. In a 0.2 page, so is, wherever it is in the markup, an `animate` and a `sound` that begins on a click: what a script adds, the script moves and plays. (0.3) In a 0.3 page the markup's own elements are also `animate`, `panel`, and `a`, and what it holds may have click actions; an `animate` or a click action whose target or trigger is not in the scene once the markup is added is left out |
| `holoml.remove(thing)` | Removes an element and everything in it |
| `holoml.on(type, listener)` | Calls `listener` with each event of that type (below). Returns a function that stops it |
| `holoml.aim()` | What is in the middle of the view, under the crosshair: `{ thing, point, normal }` as for a click, or `null` |
| `holoml.viewer` | The viewer (below) |
| `holoml.background` | The scene's background colour; can be set |
| `holoml.reducedMotion` | `true` when the viewer asked for reduced motion; keep still what would only move for effect |

### The viewer

| Member | What it is |
|---|---|
| `position` | Where the viewer's eyes are; can be set, to move them |
| `direction` | Which way they look: a vector of length 1 |
| `lookAt(point)` | Turns them to look at a point |
| `speed` | For walking: how fast, in metres a second, from 0.5 to 10; starts as the `viewpoint` says, and can be set. A value outside the range is an error |
| `turnSpeed` | For walking: how fast they turn, in degrees a second, from 10 to 720; starts as the `viewpoint` says, and can be set. A value outside the range is an error |
| `place` | (0.3) The `id` of the place (the `viewpoint`) the viewer last arrived at: the first one when the scene is shown, or the one the page's address names; then each one the viewer goes to by a link to `#name`, the renderer's list of places, or `goTo`. Walking does not change it. `null` when the scene's viewpoints have no ids. Read only |
| `goTo(id)` | (0.3) Takes the viewer to the place with this `id`, as a link to `#id` does (through a fade, unless the viewer asked for reduced motion). An id that is not a place's is an error |

Vectors are arrays of three numbers, `[x, y, z]`: metres for positions
and degrees for rotations, in the parent's space, as in the markup. The
viewer's `position` and `direction`, and the `point` and `normal` of a
click and of `holoml.aim()`, are in the scene's own space, whatever
groups the thing that was hit is in. An array that a thing or the
viewer gives is frozen: a script cannot change it in place, which is an
error, and sets the member to a new array to move the thing.

### Things

`holoml.find` and `holoml.add` give things: handles on elements. A
member a thing's kind does not have is `undefined`, and setting it does
nothing: it is not an error, and the member is `undefined` still. After
a thing is removed, setting its members does nothing.

| Member | Kinds | What it is |
|---|---|---|
| `id` | all | Its id, or `null` |
| `kind` | all | `"model"`, `"group"`, `"light"`, `"label"`, `"panel"`, `"sound"`, `"hud"`, `"slider"`, `"choice"`, (0.3) `"animate"`, `"water"`, or `"plan"` |
| `parent` | all | The nearest group it is in, as a thing, or `null` when it is in none. A link is not a thing, and does not count: a model in a link in a group has that group as its parent |
| `position` | model, group, label, panel, light, sound | Where it is; can be set. For a sound, where it comes from, or `null` for one that has no place; setting a place gives it one (with its `range`, 20 metres unless the page says). In a 0.2 page, setting `null` is an error: a sound that has a place keeps one; (0.3) in a 0.3 page, setting `null` takes its place away, and it is heard as a sound without a place again |
| `rotation` | model, group, panel | How it is turned; can be set |
| `scale` | model, group | How big; can be set |
| `visible` | model, group, label, panel, (0.3) plan | Whether it is shown; can be set. A thing that is not shown, by its own `visible` or that of a group around it, takes no clicks (a click, the crosshair, and `holoml.aim()` go through it to what is behind) and does not stop the walker, whatever its `solid` |
| `solid` | model, group | Whether the walker is stopped by it; can be set |
| `animationSpeed` | model | How fast its own animation plays: `1` as it was made, `2` twice as fast, `0.5` half as fast, `0` held still; from 0 to 4; can be set. A value outside that range is an error. A model that plays no animation keeps the value for when it does |
| `loaded` | model, group | (Read only) Whether its file has loaded (a model); whether every model in it that is near enough to load has loaded or been left out (a group). A group that loads by area, or is in one, is not loaded while it is let go |
| `text` | label, panel, hud, slider, choice | Its words (for a `hud`, lines separated by `"\n"`; for a `panel`, paragraphs separated by `"\n\n"`; for a `slider` or a `choice`, its label); can be set. A renderer MAY keep only the start of a very long text (HyperSpace 3D keeps 10,000 characters) |
| `label` | (0.3) model, group | Its name, as screen readers hear it, or `null` for none; can be set |
| `color` | light, label, hud, (0.3) water | Its colour, as `"#rrggbb"`; can be set |
| `clarity` | (0.3) water | How far one can see through it, in metres, more than 0; can be set. A value that is not more than 0 is an error |
| `start()`, `stop()`, `running` | (0.3) animate | Starts it from its beginning, as when it begins by itself (with reduced motion, it shows its end at once); stops it where it is, which it keeps; whether it runs. A click action's `animate` still also runs on its clicks |
| `intensity` | light | How bright; can be set |
| `material(name, change)` | model | Changes one of the model's materials; `change` may have `color`, `metalness`, `roughness`, and `opacity`, as `material` has |
| `play()`, `stop()`, `playing` | sound | Plays from the start; stops; whether it plays. Before sounds may play (section 7, `sound`), `play()` does nothing |
| `volume` | sound | How loud, from 0 to 1; can be set, also while it plays |
| `value` | slider | The number chosen; can be set (from `min` to `max`, kept to its steps), which moves the slider without a `change` event |
| `value` | choice | The chosen option's value; can be set to another option's value, which picks it (and changes the material) without a `change` event; any other value is an error |
| `options` | choice | Its options' values, in order |
| `min`, `max`, `step` | slider | Its range and steps, as the page says |
| `remove()` | all | As `holoml.remove(thing)` |

### Events

Every event has a `type`, its kind, as `holoml.on` was given it
(clarified).

| Type | When | Members | What they hold |
|---|---|---|---|
| `click` | The viewer clicks or taps a point of the scene (not a drag), with any button | `thing`, `point`, `normal`, `button` | `thing` is the innermost element with a place that was hit, or `null`; `point` and `normal` say where it was hit, and which way the face hit is facing, or are `null`; `button` is `"left"`, `"right"`, or `"middle"`. A right-click goes to the page instead of opening the renderer's menu while a script listens for clicks. A click on a link still follows it, and a click on a trigger still runs its click actions, both after the scripts have been told (section 9, "Interacting") |
| `key` | A key goes down or up while the page has the keyboard | `key`, `down`, `repeat` | `key` is the key, as a web page's `KeyboardEvent.key` (`"e"`, `"1"`, `" "`); `down` is `true` or `false`; `repeat` is `true` when the key is held down and repeating, as a web page's `KeyboardEvent.repeat` (clarified). The renderer's own keys (walking, turning) still work. A key pressed together with Ctrl, Alt, or the system's key (Meta) is the renderer's and does not reach scripts, and neither does a key that a slider, a choice, or another of the renderer's controls uses while it has the keyboard |
| `frame` | Before each frame is drawn | `time`, `dt` | `time` is the milliseconds since the scene was shown. `dt` is how far the scene moves on in this frame, in milliseconds: the time since the last frame, but never more than 100, so that after a slow frame what a script moves by `dt` does not jump; and where there is no last frame to measure from (the first frame, and the first after drawing stopped) it is one frame's usual time, about 16. The sum of `dt` can so fall behind `time`. While a script listens for frames, the renderer MUST keep drawing, except while the page cannot be seen (for example, while its tab is behind another): then it MAY stop drawing, and frames with it, until the page is seen again |
| `change` | The viewer moves a slider, or picks an option of a choice | `thing`, `value` | `thing` is the slider or the choice, and `value` a slider's number or the chosen option's value |
| `place` | (0.3) The viewer arrives at a place: by a link to `#name`, the renderer's list of places, or `goTo` | `place` | `place` is the place's `id` |
| `load` | A group that loads by area (`load="near"`) has loaded its models (its `loaded` became `true`), or let them go | `thing`, `loaded` | `thing` is the group, and `loaded` is `true` when its models are in and `false` when they were let go. A model a script adds to a group already in does not make it tell again |

The keyboard can do whatever the mouse does: with a crosshair, a script
uses `holoml.aim()` to act on what is in the middle of the view when a
key is pressed.

A slider and the viewer's speeds, together:

```js
// pace.js: the slider "pace" (from 0.5 to 2) sets how fast the viewer walks and turns.
const WALK = 4.3; // metres a second at 1
const TURN = 120; // degrees a second at 1
const pace = holoml.find('pace');
holoml.on('change', (e) => {
  if (e.thing !== pace) return;
  holoml.viewer.speed = WALK * e.value;
  holoml.viewer.turnSpeed = TURN * e.value;
  pace.text = `Speed ${e.value}×`;
});
```

### Limits for scripts

Things a script adds count toward the renderer's limits (section 9,
"Limits"): when one is reached, `holoml.add` leaves out what crossed it,
returns the things it did add, and the console says why. Elements a
script adds are not part of the page's text, so a renderer's outline of
the scene lists only those with an `id`.

## 11. Versions

The `version` attribute names the HoloML version a page is written for.
A reader MUST refuse a version it does not know, rather than guess: a
reader that knows only 0.1 refuses a 0.2 page with
`unsupported-version`. What refusing is depends on the reader:

- A checker reports `unsupported-version`, at the attribute. It then
  checks the rest of the page by the newest version it knows, so that
  the page's other mistakes are found in the same pass. What it reports
  beyond the version is for the page's author, and says nothing of what
  the page means.
- A renderer MUST NOT draw the page, neither as the version it names
  nor as any other. It tells the viewer that the page is written for a
  version it does not know.

A page whose root has no `version` is treated in the same way, as there
is nothing to go by but a guess: a checker reports the
`missing-attribute` and checks the rest by the newest version it knows,
and a renderer MUST NOT draw the page.

- 0.1 (2026-09-26): models, groups, lights, labels, links, materials,
  animation of position, rotation, and scale, orbit and walk.
- 0.2 (2026-09-29; begun 2026-09-27): scripts and the scene API (section
  10), `sound`, `hud`, `slider`, `choice`, walls and gravity (`solid`,
  `gravity`, `jump`), a crosshair, walking and turning speeds (`speed`,
  `turn-speed`), shadows, textured materials (`map`, `normal-map`,
  `roughness-map`, `repeat`), light from the surroundings
  (`environment`), the animation of a light's position, brightness,
  and colour, and of the background, text of more than one line
  (`panel`), click actions (`begin`, `trigger`, `toggle`), places
  (several viewpoints, and `#name` in an address), a `sky`, a floor
  plan (`plan`), loading by area (`load`, `near`, and stand-ins), water
  (`water`), sounds from a place (a sound's `position` and `range`),
  and a model's animation speed in the scene API. Everything in 0.1
  means the same in a 0.2 page.
- 0.3 (2026-10-07): names for models and groups (`label`), the
  language and direction of text (`lang`, `dir`), a lighter model
  shown far away (`far`, `far-from`), ids for `animate` and `water`,
  and in the scene API: starting and stopping an `animate`, going to a
  place and knowing which one the viewer is at (`goTo`, `place`, and
  the `place` event), changing the water, finding the floor plan, more
  that `holoml.add` takes, and taking a sound's place away. Everything
  in 0.1 and 0.2 means the same in a 0.3 page.

HoloML is experimental (see "Status of this document"): until 1.0, a
later version may change or remove what an earlier one has, so a page
that moves to it may need changes, and every page keeps the meaning of
the version it declares.

Ideas for later versions: movement along paths, physics, named colours,
styles shared between elements, and spaces shared by several people.

## 12. Security considerations

HoloML 0.1 has no scripts. Pages can only load glTF models and link to
other pages, over http or https or by relative address. A renderer
SHOULD load models only from the page's own site or from sites it
permits, SHOULD apply the same privacy protection as for other pages,
and MUST NOT let a page read anything from the viewer's computer.

(0.2) A renderer MUST load scripts and sounds from the page's own site
only; a page cannot hold a script's code in the markup. A renderer MUST
run a page's scripts as a web browser runs a web page's: in the page's
own sandbox, with nothing more than a web page may do, and so that a
script that never stops cannot stop the renderer itself (the viewer can
still leave or close the page). No sound plays before the viewer's first
click, tap, or key on the page (section 7, `sound`). Elements a script
adds, and sound files, count toward the renderer's limits like the
page's own (section 9, "Limits"); so do a material's pictures, the
surroundings (`environment`), the `sky`, and a `plan`'s picture, which
also come from the page's own site only.

A page cannot link to `javascript:`, `data:`, or `file:` addresses
(`unsafe-link`, section 8), and cannot hide such a scheme behind a
control character or a space that a URL parser would drop (a
`bad-value`, section 6). A renderer that resolves an address SHOULD
check the scheme of what it resolved to as well. A link to another site
opens it as any web page opens. A renderer's limits (section 9) keep a
heavy or hostile page from exhausting the viewer's memory or freezing
the renderer.

*Note (non-normative):* HyperSpace 3D, opening a page from the
computer, lets it load files only from its own folder and the folders
inside it.

## 13. Privacy considerations

*This section is non-normative.* It answers, for HoloML, the questions
of W3C's security and privacy questionnaire [SECURITY-PRIVACY].

- What a page learns: a 0.2 page's scripts learn what happens in its own
  scene: where the viewer is and which way they look, their clicks and
  keys on the page, sliders and choices, whether they asked for reduced
  motion, and whether the page's models have loaded. They learn nothing
  about the viewer's computer, or about other pages, that a web page
  could not learn.
- What a page fetches: its models, and (0.2) its scripts, sounds, and
  pictures, from the addresses it gives; scripts, sounds, and pictures
  only from its own site (section 12). A link fetches another page only
  when the viewer follows it. A renderer's protections for web pages
  (blocking trackers, for example) apply to HoloML pages as well.
- What a page keeps: nothing by HoloML itself. A page's scripts may use
  what a web page may, such as the tab's session storage.
- Sound cannot start before the viewer has clicked, tapped, or pressed
  a key on the page.

## 14. Accessibility considerations

*This section is non-normative.* It gathers what sections 5 to 10
require for people who use the keyboard, screen readers, or reduced
motion, and what an author can do.

- The keyboard and screen readers reach a page's links, click actions
  (named by their `label`), places (named by their `label`), sliders,
  choices, and floor plan (named by its `label`), through the renderer's
  outline; walking and turning, and (0.2) aiming with a crosshair, work
  from the keyboard.
- Text is read as text: titles, labels, (0.2) panels, and what is fixed
  to the screen reach screen readers, Find in page, and any text-only
  view of the page.
- With reduced motion, animations show their end at once, those that
  begin with the page and click actions alike, a model's own animation
  is held at its first frame, a fade between pages or places becomes a
  cut, (0.2) the water's moving light holds still, and scripts are told
  (`holoml.reducedMotion`), to keep still what they move.
- Sound waits for the viewer's first click, tap, or key.
- A renderer's own controls around a scene (its outline, its text view,
  and what it fixes to the screen) are web content, to which the Web
  Content Accessibility Guidelines apply [WCAG22].
- Authors can give ids and labels to what matters, write words as text
  (a `panel`) rather than as pictures, and keep a page usable without
  its scripts' sounds.

- (0.3) A model and a group can have a name of their own (`label`), which
  screen readers hear in place of its id or its file's name; and text
  says which language it is in (`lang`), so that a screen reader reads
  it in that language's voice.

## 15. Internationalization considerations

*This section is non-normative.*

- A page is Unicode text in UTF-8; any character can be written as
  itself or as a numeric character reference.
- Columns in error messages count UTF-16 code units, as most editors do
  (section 5).
- Numbers in attributes are written with `.` and no grouping, whatever
  the viewer's language; lengths are in metres and angles in degrees.
- (0.3) A page says which language its text is in, and which way it
  runs, with `lang` and `dir`, as HTML does (section 7, "Language and
  direction"); a renderer draws right-to-left text from right to left,
  with the fonts of the viewer's system. A 0.1 or 0.2 page cannot say
  so: its text is in no stated language, and runs left to right, as
  written.

## Appendix A. The formal grammar

*This appendix is non-normative:* sections 5 to 8 and the conformance
samples say what a page is. The files are in the repository's `spec/`
folder.

### A.1 The syntax, in ABNF

The syntax of section 5 in ABNF [RFC5234], with RFC 7405's
case-sensitive strings [RFC7405]. Each comment names the syntax error a
reader reports where the text breaks the rule beside it.

<!-- spec/holoml.abnf -->
```abnf
; HoloML 0.2: the syntax of a page, in ABNF (RFC 5234), with RFC 7405's
; %s"..." for case-sensitive strings. Informative: SPEC.md section 5 and
; the conformance samples say what a reader does. Each comment names
; the syntax error a reader reports where the text breaks the rule
; beside it.
; too-deep: nesting more than 256 elements deep, which is not a matter
; of the grammar (section 5)

document       = [ BOM ] misc element misc
                 ; no-root: no element at all
                 ; second-root: a second element after the first
                 ; text-outside-root: text before or after the element
                 ; stray-end-tag: an end tag before or after it
misc           = *( S / comment )
BOM            = %xFEFF

element        = empty-element / start-tag content end-tag
                 ; unclosed-element: the text ends before the end tag
                 ; unsupported-markup: "<!" or "<?" other than a comment
empty-element  = "<" name *( 1*S attribute ) *S "/>"
                 ; stray-slash: a "/" in a tag not followed by ">"
start-tag      = "<" name *( 1*S attribute ) *S ">"
                 ; unexpected-end: the text ends inside a tag
                 ; missing-space: an attribute with no space before it
end-tag        = "</" name *S ">"
                 ; unexpected-end: more than the name before the ">"
                 ; mismatched-end-tag: the name of another element
                 ; stray-end-tag: an end tag with no element open
content        = *( element / comment / text )

name           = LOWER *( LOWER / DIGIT / "-" )
                 ; invalid-name: no letter where a name begins
                 ; uppercase-name: an upper-case letter in a name
attribute      = name [ *S "=" *S value ]
                 ; a name alone is a flag (autoplay)
                 ; duplicate-attribute: a name given twice in one tag
value          = DQUOTE *( dq-char / reference ) DQUOTE
               / "'" *( sq-char / reference ) "'"
                 ; unquoted-value: a value without quotes
                 ; unclosed-value: a value whose closing quote is missing
                 ; less-than-in-value: a "<" in a value (after a line
                 ; end in the value, unclosed-value: section 5)
dq-char        = %x01-21 / %x23-25 / %x27-3B / %x3D-10FFFF
                 ; any character but NUL, '"', "&", and "<"
sq-char        = %x01-25 / %x28-3B / %x3D-10FFFF
                 ; any character but NUL, "'", "&", and "<"

text           = 1*( text-char / reference )
text-char      = %x01-25 / %x27-3B / %x3D-10FFFF
                 ; any character but NUL, "&", and "<"
                 ; null-character: NUL in text, a value, or a comment
reference      = "&" ( %s"amp" / %s"lt" / %s"gt" / %s"quot" / %s"apos"
                     / "#" 1*7DIGIT / %s"#x" 1*6HEXDIG ) ";"
                 ; a number names a Unicode scalar value other than 0:
                 ; 1 to 10FFFF, but not D800 to DFFF
                 ; bad-character-reference: any other "&"
comment        = "<!--" *( comment-char / "-" comment-char ) [ "-" ] "-->"
comment-char   = %x01-2C / %x2E-10FFFF
                 ; any character but NUL and "-"
                 ; unclosed-comment: a comment with no "-->"
                 ; bad-comment: "--" inside a comment

S              = SP / HTAB / LF / CR
LOWER          = %x61-7A
                 ; DIGIT, HEXDIG, SP, HTAB, LF, CR, and DQUOTE are
                 ; RFC 5234's core rules
```
<!-- /spec/holoml.abnf -->

### A.2 The structure, in RELAX NG

Which element may hold which, and each attribute's values, in RELAX
NG's compact syntax [RELAXNG], made from the checker's own table (a
test keeps them the same). A page's tree is read as XML would be, so a
flag, written alone, is an attribute with an empty value.

<!-- spec/holoml.rnc -->
```rnc
# HoloML 0.3: the structure of a page, in RELAX NG's compact syntax
# (ISO/IEC 19757-2). Made from the checker's table and its patterns
# (packages/schema/src/rules.ts) by packages/schema/src/relaxng.ts:
# do not edit; run `pnpm grammar:update`. Informative: SPEC.md and the
# checker say what a page may be, and more than a schema can (unique
# ids, targets that exist, values that depend on one another). A page
# is read as XML would be: a flag, written alone (autoplay), is an
# attribute with an empty value. "(0.2)" marks what a 0.1 page may
# not use. An address holds no control character (\p{Cc}), no space or
# other separator (\p{Z}), and no U+FEFF (written by its number).

start = holoml

holoml =
  element holoml {
    attribute version { string "0.1" | string "0.2" | string "0.3" },
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    head?, scene
  }

head =
  element head {
    (title? & meta* & script*)
  }

title =
  element title {
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    text  # not empty
  }

meta =
  element meta {
    attribute name { xsd:token { minLength = "1" } },
    attribute content { text },
    empty
  }

script =  # (0.2)
  element script {
    attribute src { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([jJ][sS]|[mM][jJ][sS])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } },
    empty
  }

scene =
  element scene {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,  # (0.2)
    attribute background { xsd:token { pattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" } }?,
    attribute environment { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([hH][dD][rR]|[pP][nN][gG]|[jJ][pP][gG]|[jJ][pP][eE][gG])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } }?,  # (0.2)
    attribute sky { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([hH][dD][rR]|[pP][nN][gG]|[jJ][pP][gG]|[jJ][pP][eE][gG])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } }?,  # (0.2)
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    (group* & model* & light* & label* & a* & animate* & sound* & panel* & viewpoint* & hud* & slider* & choice* & plan? & water?)
  }

group =
  element group {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute position { list { number, number, number } }?,
    attribute rotation { list { number, number, number } }?,
    attribute scale { list { number } | list { number, number, number } }?,
    attribute solid { flag }?,  # (0.2)
    attribute shadows { flag }?,  # (0.2)
    attribute load { string "page" | string "near" }?,  # (0.2)
    attribute near { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" } }?,  # (0.2)
    attribute label { xsd:token { minLength = "1" } }?,  # (0.3)
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    (group* & model* & light* & label* & a* & animate* & sound* & panel*)
  }

model =
  element model {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute position { list { number, number, number } }?,
    attribute rotation { list { number, number, number } }?,
    attribute scale { list { number } | list { number, number, number } }?,
    attribute src { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([gG][lL][tT][fF]|[gG][lL][bB])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } },
    attribute animation { xsd:token { minLength = "1" } }?,
    attribute autoplay { flag }?,
    attribute solid { flag }?,  # (0.2)
    attribute shadows { flag }?,  # (0.2)
    attribute stand-in { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([gG][lL][tT][fF]|[gG][lL][bB])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } }?,  # (0.2)
    attribute label { xsd:token { minLength = "1" } }?,  # (0.3)
    attribute far { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([gG][lL][tT][fF]|[gG][lL][bB])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } }?,  # (0.3)
    attribute far-from { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" } }?,  # (0.3)
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    material*
  }

material =
  element material {
    attribute name { xsd:token { minLength = "1" } },
    attribute color { xsd:token { pattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" } }?,
    attribute metalness { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0" maxInclusive = "1" } }?,
    attribute roughness { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0" maxInclusive = "1" } }?,
    attribute opacity { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0" maxInclusive = "1" } }?,
    attribute map { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([pP][nN][gG]|[jJ][pP][gG]|[jJ][pP][eE][gG]|[wW][eE][bB][pP])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } }?,  # (0.2)
    attribute normal-map { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([pP][nN][gG]|[jJ][pP][gG]|[jJ][pP][eE][gG]|[wW][eE][bB][pP])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } }?,  # (0.2)
    attribute roughness-map { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([pP][nN][gG]|[jJ][pP][gG]|[jJ][pP][eE][gG]|[wW][eE][bB][pP])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } }?,  # (0.2)
    attribute repeat { list { more-than-0 } | list { more-than-0, more-than-0 } }?,  # (0.2)
    empty
  }

viewpoint =
  element viewpoint {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,  # (0.2)
    attribute label { xsd:token { minLength = "1" } }?,  # (0.2)
    attribute position { list { number, number, number } }?,
    attribute look-at { list { number, number, number } }?,
    attribute mode { string "orbit" | string "walk" }?,
    attribute gravity { flag }?,  # (0.2)
    attribute jump { flag }?,  # (0.2)
    attribute crosshair { flag }?,  # (0.2)
    attribute speed { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0.5" maxInclusive = "10" } }?,  # (0.2)
    attribute turn-speed { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "10" maxInclusive = "720" } }?,  # (0.2)
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    empty
  }

light =
  element light {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute type { string "ambient" | string "directional" | string "point" | string "spot" },
    attribute color { xsd:token { pattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" } }?,
    attribute intensity { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0" } }?,
    attribute position { list { number, number, number } }?,
    attribute look-at { list { number, number, number } }?,
    attribute range { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0" } }?,
    attribute angle { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0" maxInclusive = "90" } }?,
    attribute shadows { flag }?,  # (0.2)
    empty
  }

label =
  element label {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute position { list { number, number, number } }?,
    attribute size { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" } }?,
    attribute color { xsd:token { pattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" } }?,
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    text  # not empty
  }

a =
  element a {
    attribute href { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}]+" } },
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    (model* & group* & label* & panel*)
  }

animate =
  element animate {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,  # (0.3)
    attribute target { xsd:string { pattern = "#[A-Za-z][A-Za-z0-9_\-]*" } },
    attribute \attribute { string "position" | string "rotation" | string "scale" | string "intensity" | string "color" | string "background" },
    attribute from { text }?,
    attribute to { text },
    attribute duration { xsd:token { pattern = "([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?(ms|s)" } },
    attribute repeat { xsd:token { pattern = "0*[1-9][0-9]*|indefinite" } }?,
    attribute begin { string "load" | string "click" }?,  # (0.2)
    attribute trigger { xsd:string { pattern = "#[A-Za-z][A-Za-z0-9_\-]*" } }?,  # (0.2)
    attribute toggle { flag }?,  # (0.2)
    attribute label { xsd:token { minLength = "1" } }?,  # (0.2)
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    empty
  }

sound =  # (0.2)
  element sound {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute src { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([oO][gG][gG]|[mM][pP]3|[wW][aA][vV])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } },
    attribute loop { flag }?,
    attribute autoplay { flag }?,
    attribute volume { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0" maxInclusive = "1" } }?,
    attribute position { list { number, number, number } }?,
    attribute range { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" } }?,
    attribute begin { string "load" | string "click" }?,
    attribute trigger { xsd:string { pattern = "#[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute label { xsd:token { minLength = "1" } }?,
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    empty
  }

hud =  # (0.2)
  element hud {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute corner { string "top-left" | string "top-right" | string "bottom-left" | string "bottom-right" }?,
    attribute size { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" } }?,
    attribute color { xsd:token { pattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" } }?,
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    text  # may be empty
  }

slider =  # (0.2)
  element slider {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute corner { string "top-left" | string "top-right" | string "bottom-left" | string "bottom-right" }?,
    attribute min { number }?,
    attribute max { number }?,
    attribute step { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" } }?,
    attribute value { number }?,
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    text  # not empty
  }

choice =  # (0.2)
  element choice {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute corner { string "top-left" | string "top-right" | string "bottom-left" | string "bottom-right" }?,
    attribute label { xsd:token { minLength = "1" } }?,
    attribute target { xsd:string { pattern = "#[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute material { xsd:token { minLength = "1" } }?,
    attribute value { xsd:token { minLength = "1" } }?,
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    option+
  }

option =  # (0.2)
  element option {
    attribute value { xsd:token { minLength = "1" } }?,
    attribute color { xsd:token { pattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" } }?,
    attribute metalness { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0" maxInclusive = "1" } }?,
    attribute roughness { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0" maxInclusive = "1" } }?,
    attribute opacity { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minInclusive = "0" maxInclusive = "1" } }?,
    attribute map { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([pP][nN][gG]|[jJ][pP][gG]|[jJ][pP][eE][gG]|[wW][eE][bB][pP])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } }?,  # (0.2)
    attribute normal-map { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([pP][nN][gG]|[jJ][pP][gG]|[jJ][pP][eE][gG]|[wW][eE][bB][pP])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } }?,  # (0.2)
    attribute roughness-map { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([pP][nN][gG]|[jJ][pP][gG]|[jJ][pP][eE][gG]|[wW][eE][bB][pP])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } }?,  # (0.2)
    attribute repeat { list { more-than-0 } | list { more-than-0, more-than-0 } }?,  # (0.2)
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    text  # not empty
  }

panel =  # (0.2)
  element panel {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute position { list { number, number, number } }?,
    attribute rotation { list { number, number, number } }?,
    attribute width { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" } }?,
    attribute size { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" } }?,
    attribute color { xsd:token { pattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" } }?,
    attribute background { xsd:token { pattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" } }?,
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    text  # not empty
  }

water =  # (0.2)
  element water {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,  # (0.3)
    attribute position { list { number, number, number } }?,
    attribute size { list { more-than-0, more-than-0, more-than-0 } },
    attribute color { xsd:token { pattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" } }?,
    attribute clarity { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" } }?,
    attribute caustics { flag }?,
    empty
  }

plan =  # (0.2)
  element plan {
    attribute id { xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\-]*" } }?,
    attribute corner { string "top-left" | string "top-right" | string "bottom-left" | string "bottom-right" }?,
    attribute src { xsd:token { pattern = "[^\p{Cc}\p{Z}\x{FEFF}?#]*\.([pP][nN][gG]|[jJ][pP][gG]|[jJ][pP][eE][gG]|[wW][eE][bB][pP])([?#][^\p{Cc}\p{Z}\x{FEFF}]*)?" } },
    attribute area { list { number, number, number, number } },
    attribute width { xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" } }?,
    attribute label { xsd:token { minLength = "1" } }?,
    attribute lang { xsd:string { pattern = "[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*" } }?,  # (0.3)
    attribute dir { string "ltr" | string "rtl" | string "auto" }?,  # (0.3)
    empty
  }

# Values

# A number: a decimal number, optionally with an exponent; never INF or NaN.
number = xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" }
more-than-0 = xsd:double { pattern = "-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+\-]?[0-9]+)?" minExclusive = "0" }
# A flag, written alone in HoloML.
flag = string ""
```
<!-- /spec/holoml.rnc -->

### A.3 The scene API, in Web IDL

The scene API of section 10 in Web IDL [WEBIDL]. A test keeps it and
section 10's tables the same.

<!-- spec/holoml.webidl -->
```webidl
// HoloML 0.3: the scene API (SPEC.md section 10), in Web IDL. A page's
// scripts reach it as the global `holoml`. Vectors are arrays of three
// numbers: metres for positions, degrees for rotations. One that a
// thing or the viewer gives is frozen (FrozenArray): a script sets the
// member to a new array, and does not change the array it was given. A
// thing has the members of its kind's interface; any other member is
// undefined, and setting it does nothing and is not an error.

[Exposed=Window]
interface HoloML {
  readonly attribute DOMString version;
  readonly attribute Promise<undefined> ready;
  Thing? find(DOMString id);
  sequence<Thing> add(DOMString markup, optional GroupThing? parent = null);
  undefined remove(Thing thing);
  HoloMLStop on(DOMString type, HoloMLListener listener);
  HoloMLHit? aim();
  readonly attribute HoloMLViewer viewer;
  attribute DOMString background;
  readonly attribute boolean reducedMotion;
};

callback HoloMLListener = undefined (HoloMLEvent event);
callback HoloMLStop = undefined ();

[Exposed=Window]
interface HoloMLViewer {
  attribute FrozenArray<double> position;
  readonly attribute FrozenArray<double> direction;
  undefined lookAt(sequence<double> point);
  attribute double speed;
  attribute double turnSpeed;
  // (0.3) The id of the place the viewer last arrived at, or null.
  readonly attribute DOMString? place;
  // (0.3) Goes to the place with this id; any other id is an error.
  undefined goTo(DOMString id);
};

// Where a click or the crosshair hit: `point` and `normal` are in the
// scene's own space.
dictionary HoloMLHit {
  Thing? thing;
  sequence<double>? point;
  sequence<double>? normal;
};

dictionary HoloMLEvent {
  required DOMString type;
  Thing? thing;
  sequence<double>? point;
  sequence<double>? normal;
  DOMString button;
  DOMString key;
  boolean down;
  boolean repeat;
  double time;
  double dt;
  (double or DOMString) value;
  boolean loaded;
  // (0.3) The place the viewer arrived at, for a "place" event.
  DOMString place;
};

[Exposed=Window]
interface Thing {
  readonly attribute DOMString? id;
  readonly attribute DOMString kind;
  // The nearest group it is in; a link between them does not count.
  readonly attribute GroupThing? parent;
  undefined remove();
};

[Exposed=Window]
interface ModelThing : Thing {
  attribute FrozenArray<double> position;
  attribute FrozenArray<double> rotation;
  attribute FrozenArray<double> scale;
  attribute boolean visible;
  attribute boolean solid;
  attribute double animationSpeed;
  readonly attribute boolean loaded;
  undefined material(DOMString name, HoloMLMaterialChange change);
  // (0.3) Its name, as screen readers hear it.
  attribute DOMString? label;
};

dictionary HoloMLMaterialChange {
  DOMString color;
  double metalness;
  double roughness;
  double opacity;
};

[Exposed=Window]
interface GroupThing : Thing {
  attribute FrozenArray<double> position;
  attribute FrozenArray<double> rotation;
  attribute FrozenArray<double> scale;
  attribute boolean visible;
  attribute boolean solid;
  readonly attribute boolean loaded;
  // (0.3) Its name, as screen readers hear it.
  attribute DOMString? label;
};

[Exposed=Window]
interface LightThing : Thing {
  attribute FrozenArray<double> position;
  attribute DOMString color;
  attribute double intensity;
};

[Exposed=Window]
interface LabelThing : Thing {
  attribute FrozenArray<double> position;
  attribute boolean visible;
  attribute DOMString text;
  attribute DOMString color;
};

[Exposed=Window]
interface PanelThing : Thing {
  attribute FrozenArray<double> position;
  attribute FrozenArray<double> rotation;
  attribute boolean visible;
  attribute DOMString text;
};

[Exposed=Window]
interface SoundThing : Thing {
  // Null for a sound that has no place. Setting a place gives it one;
  // setting null is an error (a TypeError) in a 0.2 page, and takes the
  // place away in a 0.3 page.
  attribute FrozenArray<double>? position;
  undefined play();
  undefined stop();
  readonly attribute boolean playing;
  attribute double volume;
};

[Exposed=Window]
interface HudThing : Thing {
  attribute DOMString text;
  attribute DOMString color;
};

[Exposed=Window]
interface SliderThing : Thing {
  attribute DOMString text;
  attribute double value;
  readonly attribute double min;
  readonly attribute double max;
  readonly attribute double step;
};

[Exposed=Window]
interface ChoiceThing : Thing {
  attribute DOMString text;
  attribute DOMString value;
  readonly attribute FrozenArray<DOMString> options;
};

// (0.3) An animate element, found by its id.
[Exposed=Window]
interface AnimateThing : Thing {
  undefined start();
  undefined stop();
  readonly attribute boolean running;
};

// (0.3) The scene's water, found by its id.
[Exposed=Window]
interface WaterThing : Thing {
  attribute DOMString color;
  // More than 0; any other value is an error.
  attribute double clarity;
};

// (0.3) The floor plan, found by its id.
[Exposed=Window]
interface PlanThing : Thing {
  attribute boolean visible;
};
```
<!-- /spec/holoml.webidl -->

## Appendix B. IANA considerations

*This appendix is non-normative.* The media type `model/vnd.holoml` is
not registered yet. Its registration, in the template of RFC 6838
[RFC6838], would be:

```text
Type name: model
Subtype name: vnd.holoml
Required parameters: none
Optional parameters: none
Encoding considerations: 8bit; HoloML pages are UTF-8 text
Security considerations: see section 12 of this specification. A page
  may load files and 0.2 pages may run scripts, in the viewer's browser
  and as a web page's scripts run, from the page's own site; addresses
  with schemes other than http and https are refused; a renderer may
  limit what one page can use.
Interoperability considerations: every page declares its HoloML
  version, and a reader refuses a version it does not know.
Published specification: HoloML,
  https://srajpal.github.io/holoml/spec/
Applications that use this media type: HyperSol HyperSpace 3D, a web
  browser; HoloML's checker.
Fragment identifier considerations: a fragment names a place: the
  viewpoint with that id (section 7, viewpoint).
Additional information:
  Deprecated alias names for this type: none
  Magic number(s): none
  File extension(s): .holoml
  Macintosh file type code(s): none
Person & email address to contact for further information: The HoloML
  Authors, through https://github.com/srajpal/holoml/issues (an email
  address is given when the type is registered)
Intended usage: COMMON
Restrictions on usage: none
Author: The HoloML Authors
Change controller: The HoloML Authors
```

## Appendix C. Changes

*This appendix is non-normative.*

- 0.3, first edition (2026-10-07). New in 0.3: `label` on `model` and
  `group`; `lang` and `dir` (section 7, "Language and direction");
  `far` and `far-from` on `model` (section 7, "A lighter model far
  away"); `id` on `animate` and `water`; and in the scene API (section
  10): `viewer.place`, `viewer.goTo`, the `place` event, `start()`,
  `stop()`, and `running` for an `animate`, a water's `color` and
  `clarity`, the floor plan as a thing, a model's and a group's
  `label`, `animate`, `panel`, and `a` in `holoml.add`, and a sound's
  `position` set to `null`.

  For every version, written down where earlier editions left it to
  each renderer:
  - How a scene looks (section 9, "Drawing"): colour and tone mapping,
    how bright a light of an `intensity` is, the light of a scene
    without lights and of the surroundings, and the field of view.
  - The least every renderer has to manage (section 9, "Limits").
  - A further copy of an element a page may have only once is reported
    as `too-many` each time (section 8); before, only the second was.
  - An element's text is all its texts joined, a comment between them
    leaving nothing (section 5).

- 0.2, third edition (2026-09-30): the same language. This edition
  corrects places where the document disagreed with itself, with
  HoloML's checker, or with HyperSpace 3D, and says what was left
  unsaid. HoloML's parser and checker changed with it (their version
  0.2.2).

  Stricter: two kinds of page that were valid in the second edition are
  not valid in this one.
  - Whitespace is the space, the tab, the line feed, and the carriage
    return only (sections 5 and 6). A value that used another of
    Unicode's spaces, such as the no-break space, to separate its
    numbers or around itself is a `bad-value`; HoloML's checker took
    them as whitespace before.
  - An address with a control character, with a space or another
    separator, or with U+FEFF is a `bad-value` (section 6). Before, a
    control character could hide a scheme from `unsafe-link`, and
    Unicode's spaces around an address were dropped.

  The notes on HyperSpace 3D's limits (section 9, "Limits") and on how
  it draws in software (section 9, "Drawing") follow the renderer: it
  now also limits what pictures and sounds become once decoded, the
  number of lights, and how far away a thing may be.

  Corrected, where the document disagreed with itself or with the
  checker:
  - A time is a number more than 0 and its unit, in any of a number's
    forms (`1e3ms`, `1.s`), as section 6 said and the checker did not
    take.
  - Text in an attribute is not empty, which the checker held to and
    the document did not say; the `content` of `meta` may be empty, as
    in HTML (sections 6 and 7).
  - `unexpected-end` is the error wherever the text ends inside a tag
    (the checker gave `invalid-name`, `unquoted-value`, or
    `stray-slash` in three such places), and an end tag that holds more
    than its name is unfinished too (section 5).
  - A group does not hold `water`, and a second `water` is a
    `too-many`; a `choice` without an `option` is a `missing-child`; a
    sound's `range` without a `position` is a `missing-attribute`
    (sections 7 and 8).
  - A panel's `id` is for a click action's trigger and for scripts, not
    for `animate`; a plan's `id` is not reached by scripts (section 7).
  - A 0.1 page is not held to the rules 0.2 added between attributes,
    and an `id` counts wherever its element stands (section 8).
  - What refusing a version is, for a checker and for a renderer, and
    that a page with no `version` is treated the same (section 11).

  Said for the first time:
  - Which syntax error is reported, and at which character, and the
    rule that a `<` in a value after a line end is an `unclosed-value`
    (section 5, "Where a syntax error is reported"); where each problem
    is reported (section 8, "Where a problem is reported"). A byte order
    mark is not part of line 1's columns.
  - How a number is written, which numbers are too large, which values
    ignore whitespace around them, and how an address's scheme is
    recognised (section 6).
  - Reduced motion holds every animation still, those that begin with
    the page and a model's own as well as click actions (sections 7 and
    14).
  - A material that takes no light can be changed in its colour,
    opacity, and picture (section 7, `material`).
  - Which keys walk is the renderer's choice (section 7, `viewpoint`);
    going to a place may fade; the ambient lights that dim the
    surroundings are those in the scene at the time (section 7,
    `light`).
  - The page is ready when every file it loads with the page has
    loaded, pictures included (sections 9 and 10).
  - The order of what a click does: the scripts' event, the click
    actions, the link (section 9, "Interacting").
  - In the scene API (section 10): what `holoml.add` takes; `find` for
    an element that is not a thing; a thing's `parent` through a link;
    that a thing that is not shown takes no clicks and stops no walker;
    that the arrays a thing gives are frozen; that a sound's place
    cannot be set to `null`; the space of a hit's `point` and `normal`;
    `dt`, which is never more than 100; and the keys that do not reach
    scripts.

  No page that is valid in this edition changes its meaning.
- 0.2, second edition (2026-09-29): the same language, written in the
  form of W3C specifications, with an abstract, the status, conformance
  classes and requirement words (BCP 14), terminology, the processing
  model (section 9), the considerations (sections 12 to 15), the formal
  grammar and the scene API in Web IDL (appendix A), the media type's
  registration (appendix B), references, and an index. Its status says
  that HoloML is experimental, and that 0.1 and 0.2 are fixed (the
  first edition called them final). Clarified:
  - Requirement words: where the first edition wrote a renderer's
    behaviour in the present tense ("a renderer lets …"), this edition
    writes it with the requirement words of section 2, at the strength
    the text had: what the keyboard, screen readers, and reduced motion
    need, and what scripts are told, are requirements; what a renderer
    shows (highlights, text-only views) is recommended; and where it
    chooses, it may.
  - Which glTF extensions a renderer reads (section 9, "Loading").
  - Every event's `type`, and the key event's `repeat`, which
    HyperSpace 3D gives and the example sites use (section 10).
  - The renderer's limits moved from "Safety", which became "Security
    considerations" (section 12), to the processing model.

  No page changes its meaning, and every page valid in the first
  edition is valid in this one.
- 0.2 (2026-09-29): see section 11.
- 0.1.1 (2026-09-27): fixes for the parser and checker (GitHub issues #1
  to #5: inherited names, the nesting limit, numbers too large, ids
  written exactly, the null character in comments), and comments read
  in time that grows with their length only.
- 0.1 (2026-09-26): the first version.

## Index

*This section is non-normative.*

<!-- index -->
<!-- Made from the checker's table, the codes, and the terms above by pnpm reference:update; do not edit by hand. -->

### Elements

[`a`](#a), [`animate`](#animate), [`choice`](#choice),
[`group`](#group), [`head`](#head), [`holoml`](#holoml), [`hud`](#hud),
[`label`](#label), [`light`](#light), [`material`](#material),
[`meta`](#meta), [`model`](#model), [`option`](#option),
[`panel`](#panel), [`plan`](#plan), [`scene`](#scene),
[`script`](#script), [`slider`](#slider), [`sound`](#sound),
[`title`](#title), [`viewpoint`](#viewpoint), [`water`](#water)

### Attributes

- `angle`: [`light`](#light)
- `animation`: [`model`](#model)
- `area`: [`plan`](#plan)
- `attribute`: [`animate`](#animate)
- `autoplay`: [`model`](#model), [`sound`](#sound)
- `background`: [`panel`](#panel), [`scene`](#scene)
- `begin`: [`animate`](#animate), [`sound`](#sound)
- `caustics`: [`water`](#water)
- `clarity`: [`water`](#water)
- `color`: [`hud`](#hud), [`label`](#label), [`light`](#light), [`material`](#material), [`option`](#option), [`panel`](#panel), [`water`](#water)
- `content`: [`meta`](#meta)
- `corner`: [`choice`](#choice), [`hud`](#hud), [`plan`](#plan), [`slider`](#slider)
- `crosshair`: [`viewpoint`](#viewpoint)
- `dir`: [`a`](#a), [`animate`](#animate), [`choice`](#choice), [`group`](#group), [`holoml`](#holoml), [`hud`](#hud), [`label`](#label), [`model`](#model), [`option`](#option), [`panel`](#panel), [`plan`](#plan), [`scene`](#scene), [`slider`](#slider), [`sound`](#sound), [`title`](#title), [`viewpoint`](#viewpoint)
- `duration`: [`animate`](#animate)
- `environment`: [`scene`](#scene)
- `far`: [`model`](#model)
- `far-from`: [`model`](#model)
- `from`: [`animate`](#animate)
- `gravity`: [`viewpoint`](#viewpoint)
- `href`: [`a`](#a)
- `id`: [`animate`](#animate), [`choice`](#choice), [`group`](#group), [`hud`](#hud), [`label`](#label), [`light`](#light), [`model`](#model), [`panel`](#panel), [`plan`](#plan), [`scene`](#scene), [`slider`](#slider), [`sound`](#sound), [`viewpoint`](#viewpoint), [`water`](#water)
- `intensity`: [`light`](#light)
- `jump`: [`viewpoint`](#viewpoint)
- `label`: [`animate`](#animate), [`choice`](#choice), [`group`](#group), [`model`](#model), [`plan`](#plan), [`sound`](#sound), [`viewpoint`](#viewpoint)
- `lang`: [`a`](#a), [`animate`](#animate), [`choice`](#choice), [`group`](#group), [`holoml`](#holoml), [`hud`](#hud), [`label`](#label), [`model`](#model), [`option`](#option), [`panel`](#panel), [`plan`](#plan), [`scene`](#scene), [`slider`](#slider), [`sound`](#sound), [`title`](#title), [`viewpoint`](#viewpoint)
- `load`: [`group`](#group)
- `look-at`: [`light`](#light), [`viewpoint`](#viewpoint)
- `loop`: [`sound`](#sound)
- `map`: [`material`](#material), [`option`](#option)
- `material`: [`choice`](#choice)
- `max`: [`slider`](#slider)
- `metalness`: [`material`](#material), [`option`](#option)
- `min`: [`slider`](#slider)
- `mode`: [`viewpoint`](#viewpoint)
- `name`: [`material`](#material), [`meta`](#meta)
- `near`: [`group`](#group)
- `normal-map`: [`material`](#material), [`option`](#option)
- `opacity`: [`material`](#material), [`option`](#option)
- `position`: [`group`](#group), [`label`](#label), [`light`](#light), [`model`](#model), [`panel`](#panel), [`sound`](#sound), [`viewpoint`](#viewpoint), [`water`](#water)
- `range`: [`light`](#light), [`sound`](#sound)
- `repeat`: [`animate`](#animate), [`material`](#material), [`option`](#option)
- `rotation`: [`group`](#group), [`model`](#model), [`panel`](#panel)
- `roughness`: [`material`](#material), [`option`](#option)
- `roughness-map`: [`material`](#material), [`option`](#option)
- `scale`: [`group`](#group), [`model`](#model)
- `shadows`: [`group`](#group), [`light`](#light), [`model`](#model)
- `size`: [`hud`](#hud), [`label`](#label), [`panel`](#panel), [`water`](#water)
- `sky`: [`scene`](#scene)
- `solid`: [`group`](#group), [`model`](#model)
- `speed`: [`viewpoint`](#viewpoint)
- `src`: [`model`](#model), [`plan`](#plan), [`script`](#script), [`sound`](#sound)
- `stand-in`: [`model`](#model)
- `step`: [`slider`](#slider)
- `target`: [`animate`](#animate), [`choice`](#choice)
- `to`: [`animate`](#animate)
- `toggle`: [`animate`](#animate)
- `trigger`: [`animate`](#animate), [`sound`](#sound)
- `turn-speed`: [`viewpoint`](#viewpoint)
- `type`: [`light`](#light)
- `value`: [`choice`](#choice), [`option`](#option), [`slider`](#slider)
- `version`: [`holoml`](#holoml)
- `volume`: [`sound`](#sound)
- `width`: [`panel`](#panel), [`plan`](#plan)

### Terms

[address](#3-terminology), [attribute](#3-terminology),
[checker](#3-terminology), [click action](#3-terminology), [conforming
checker](#conformance-classes), [conforming page](#conformance-classes),
[conforming renderer](#conformance-classes), [element](#3-terminology),
[left out](#3-terminology), [outline](#3-terminology),
[page](#3-terminology), [place](#3-terminology),
[reader](#3-terminology), [reduced motion](#3-terminology),
[renderer](#3-terminology), [scene](#3-terminology),
[text](#3-terminology), [text view](#3-terminology), [the page's own
site](#3-terminology), [thing](#3-terminology),
[trigger](#3-terminology), [viewer](#3-terminology)

### Syntax error codes

[`bad-character-reference`](#syntax-errors),
[`bad-comment`](#syntax-errors),
[`duplicate-attribute`](#syntax-errors),
[`invalid-name`](#syntax-errors),
[`less-than-in-value`](#syntax-errors),
[`mismatched-end-tag`](#syntax-errors),
[`missing-space`](#syntax-errors), [`no-root`](#syntax-errors),
[`null-character`](#syntax-errors), [`second-root`](#syntax-errors),
[`stray-end-tag`](#syntax-errors), [`stray-slash`](#syntax-errors),
[`text-outside-root`](#syntax-errors), [`too-deep`](#syntax-errors),
[`unclosed-comment`](#syntax-errors),
[`unclosed-element`](#syntax-errors),
[`unclosed-value`](#syntax-errors), [`unexpected-end`](#syntax-errors),
[`unquoted-value`](#syntax-errors),
[`unsupported-markup`](#syntax-errors),
[`uppercase-name`](#syntax-errors)

### Problem codes

[`attribute-not-for-type`](#8-checking), [`bad-target`](#8-checking),
[`bad-value`](#8-checking), [`child-not-allowed`](#8-checking),
[`duplicate-id`](#8-checking), [`empty-text`](#8-checking),
[`missing-attribute`](#8-checking), [`missing-child`](#8-checking),
[`nested-link`](#8-checking), [`text-not-allowed`](#8-checking),
[`too-many`](#8-checking), [`unknown-attribute`](#8-checking),
[`unknown-element`](#8-checking), [`unknown-target`](#8-checking),
[`unsafe-link`](#8-checking), [`unsupported-version`](#8-checking),
[`wrong-order`](#8-checking), [`wrong-root`](#8-checking)
<!-- /index -->

## References

### Normative references

- [ECMASCRIPT] ECMAScript Language Specification. Ecma International.
  https://tc39.es/ecma262/
- [BCP47] Tags for Identifying Languages. A. Phillips, M. Davis (editors).
  IETF, September 2009. https://www.rfc-editor.org/info/bcp47
- [GLTF] glTF 2.0 Specification. The Khronos Group.
  https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- [RFC2119] Key words for use in RFCs to Indicate Requirement Levels. S.
  Bradner. IETF, March 1997. https://www.rfc-editor.org/rfc/rfc2119
- [RFC3629] UTF-8, a transformation format of ISO 10646. F. Yergeau.
  IETF, November 2003. https://www.rfc-editor.org/rfc/rfc3629
- [RFC8174] Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words. B.
  Leiba. IETF, May 2017. https://www.rfc-editor.org/rfc/rfc8174
- [UAX9] Unicode Bidirectional Algorithm. Unicode Standard Annex #9. The
  Unicode Consortium. https://www.unicode.org/reports/tr9/
- [URL] URL Standard. WHATWG. https://url.spec.whatwg.org/
- [WEBIDL] Web IDL Standard. WHATWG. https://webidl.spec.whatwg.org/

### Informative references

- [ACES] Academy Color Encoding System: the reference rendering
  transform's filmic tone curve. Academy of Motion Picture Arts and
  Sciences. https://www.oscars.org/science-technology/sci-tech-projects/aces
- [HTML] HTML Standard. WHATWG. https://html.spec.whatwg.org/
- [RELAXNG] RELAX NG Compact Syntax. OASIS, 2002; ISO/IEC 19757-2.
  https://relaxng.org/compact-20021121.html
- [RFC5234] Augmented BNF for Syntax Specifications: ABNF. D. Crocker, P.
  Overell. IETF, January 2008. https://www.rfc-editor.org/rfc/rfc5234
- [RFC6838] Media Type Specifications and Registration Procedures. N.
  Freed, J. Klensin, T. Hansen. IETF, January 2013.
  https://www.rfc-editor.org/rfc/rfc6838
- [RFC7405] Case-Sensitive String Support in ABNF. P. Kyzivat. IETF,
  December 2014. https://www.rfc-editor.org/rfc/rfc7405
- [RFC7841] RFC Streams, Headers, and Boilerplates. J. Halpern, L.
  Daigle, O. Kolkman (editors). IETF, May 2016.
  https://www.rfc-editor.org/rfc/rfc7841
- [SECURITY-PRIVACY] Self-Review Questionnaire: Security and Privacy.
  W3C Technical Architecture Group.
  https://www.w3.org/TR/security-privacy-questionnaire/
- [WCAG22] Web Content Accessibility Guidelines (WCAG) 2.2. W3C.
  https://www.w3.org/TR/WCAG22/

## Acknowledgements

*This section is non-normative.*

HoloML is written by The HoloML Authors (the repository's AUTHORS file),
with its first renderer, HyperSol HyperSpace 3D. Its example sites use
models, pictures, and sounds credited in each site's `models/CREDITS.md`.
