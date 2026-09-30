# Reference

Facts to look up. The [specification](../../SPEC.md) is the full and
exact reference; these pages give its parts at a glance.

- [Elements and attributes](elements.md): every element, what it may
  hold and where it may be, and its attributes, from the checker's own
  table and the specification's words.
- [The scene API](api.md): the `holoml` object, things, and events, each
  member with its declaration in Web IDL.
- [Codes](codes.md): the syntax errors and the problems a checker
  reports, with their meanings and the conformance samples that show
  them.
- [HyperSpace 3D's limits](limits.md): what one page may use in
  HyperSpace 3D, the first renderer.
- The grammar, as files: the syntax in [ABNF](../../spec/holoml.abnf),
  the structure in [RELAX NG](../../spec/holoml.rnc), and the scene API
  in [Web IDL](../../spec/holoml.webidl).

The elements, scene API, and codes pages are made from the checker's
table, the Web IDL, the conformance samples, and the specification by
`pnpm reference:update`, and a test checks that they are up to date.
