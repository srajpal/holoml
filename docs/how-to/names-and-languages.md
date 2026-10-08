# Name things, and write text in any language

This guide gives the models and groups that matter a name of their own
(0.3), so that screen readers and the text view say what they are, and
says which language a page's text is in and which way it runs (0.3), so
that it is read in the right voice and drawn the right way round.

## Give a model or a group a name

Without a name, a screen reader hears a model's `id`, or its file's
name: "shark-1", "boulder.glb". A `label` names it in words:

```holoml-scene
<group id="tunnel-fish" label="Fish in the tunnel">
  <model id="shark-1" src="fish/shark.glb" label="Blacktip reef shark" position="-4 4 10" />
  <model src="fish/snapper.glb" label="Mangrove jack" position="2 3 6" />
</group>
```

- The name is what the outline of the scene lists ("Model: Blacktip reef
  shark"), what Tab reaches, and what the text view shows.
- A group with a `label` is in the outline even without an `id`.
- Name what a visitor would ask about: the fish, the exhibits, the
  doors. Walls, floors, and rocks can stay unnamed; a model without a
  name is still in the outline, by its id or file.
- A script can read and change a name: `holoml.find('shark-1').label`.

## Say which language the text is in

Write `lang` on the root for the whole page, and on any element whose
text is in another language. The value is a language tag, as in HTML:
`en`, `ar`, `he`, `pt-BR`, `zh-Hant`.

```holoml
<holoml version="0.3" lang="en">
  <scene>
    <label position="0 2 0">Welcome</label>
    <label position="0 1.6 0" lang="fr">Bienvenue</label>
  </scene>
</holoml>
```

An element without `lang` takes it from the nearest element around it
that has one, as in HTML: a group's `lang` reaches every label in it.
A screen reader reads each text in its language's voice.

## Write right-to-left text

For Arabic, Hebrew, and other scripts written from right to left, give
`dir="rtl"` with the language:

```holoml-scene
<group lang="ar" dir="rtl">
  <label position="-2 1.6 0">أهلاً وسهلاً</label>
  <panel position="2 1.5 0" width="1.2">مرحباً بكم في المعرض. هنا تجدون التماثيل الثلاثة.</panel>
</group>
<hud corner="top-right" lang="he" dir="rtl">ברוכים הבאים</hud>
```

- A renderer lays such text out from the right: a label's words, a
  panel's lines (each starts at the right edge), and the screen's text.
- `dir="auto"` lets the first letter decide, for text that may be in
  either kind of script, such as a name a script sets.
- `dir` is inherited as `lang` is, so a group in one language says both
  once.

## Try it

- Open the text view (in HyperSpace 3D, its top-bar button), and read
  the names and the text.
- Turn on a screen reader, and Tab through the outline.
- The checker reports a tag it cannot read (`en_GB` with an underscore,
  an empty one) and a `dir` that is not `ltr`, `rtl`, or `auto`.

## See also

- The specification: [Language and direction](../../SPEC.md#language-and-direction),
  [`model`](../../SPEC.md#model), [`group`](../../SPEC.md#group).
- [Put text in the scene and on the screen](text.md)
