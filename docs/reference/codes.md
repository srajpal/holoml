# Codes

A reader reports two kinds of mistake, each with a code and the line and
column where it is. A syntax error stops the reader at the first one
([section 5](../../SPEC.md#syntax-errors) of the specification). A
problem breaks a rule of the language in a page whose syntax is right,
and a checker reports every one ([section 8](../../SPEC.md#8-checking)).
The samples are pages from the [conformance
samples](../../SPEC.md#the-conformance-samples) that give the code; each
has an `.expected.json` beside it with the place a reader gives.

This page is made by `pnpm reference:update`; do not edit it by hand.

## Syntax errors

| Code | Meaning | Samples |
|---|---|---|
| `no-root` | The document has no root element | [no-root](../../conformance/syntax-errors/no-root.holoml) |
| `text-outside-root` | Text before or after the root element | [text-outside-root](../../conformance/syntax-errors/text-outside-root.holoml) |
| `second-root` | A second root element | [second-root](../../conformance/syntax-errors/second-root.holoml) |
| `unexpected-end` | A tag is not finished before the end of the text | [unexpected-end](../../conformance/syntax-errors/unexpected-end.holoml) |
| `invalid-name` | A name was expected (for example `< scene>`) | [invalid-name](../../conformance/syntax-errors/invalid-name.holoml) |
| `uppercase-name` | A name uses upper-case letters | [uppercase-name](../../conformance/syntax-errors/uppercase-name.holoml) |
| `unquoted-value` | An attribute value without quotes | [unquoted-value](../../conformance/syntax-errors/unquoted-value.holoml) |
| `unclosed-value` | An attribute value whose closing quote is missing | [unclosed-value](../../conformance/syntax-errors/unclosed-value.holoml) |
| `duplicate-attribute` | An attribute given twice on one element | [duplicate-attribute](../../conformance/syntax-errors/duplicate-attribute.holoml) |
| `missing-space` | Two attributes with no space between them | [missing-space](../../conformance/syntax-errors/missing-space.holoml) |
| `stray-slash` | A `/` in a tag that is not followed by `>` | [stray-slash](../../conformance/syntax-errors/stray-slash.holoml) |
| `unclosed-element` | An element still open at the end of the text | [unclosed-element](../../conformance/syntax-errors/unclosed-element.holoml) |
| `mismatched-end-tag` | An end tag that does not match the open element | [mismatched-end-tag-nested](../../conformance/syntax-errors/mismatched-end-tag-nested.holoml), [mismatched-end-tag](../../conformance/syntax-errors/mismatched-end-tag.holoml) |
| `stray-end-tag` | An end tag with no element open | [stray-end-tag](../../conformance/syntax-errors/stray-end-tag.holoml) |
| `bad-character-reference` | An `&` that is not a known character reference | [bad-character-reference](../../conformance/syntax-errors/bad-character-reference.holoml), [bare-ampersand](../../conformance/syntax-errors/bare-ampersand.holoml), [inherited-reference](../../conformance/syntax-errors/inherited-reference.holoml) |
| `unclosed-comment` | A comment with no `-->` | [unclosed-comment](../../conformance/syntax-errors/unclosed-comment.holoml) |
| `bad-comment` | A comment that contains `--` | [bad-comment](../../conformance/syntax-errors/bad-comment.holoml) |
| `unsupported-markup` | `<!...>` or `<?...?>` other than a comment | [unsupported-markup](../../conformance/syntax-errors/unsupported-markup.holoml) |
| `less-than-in-value` | A `<` inside an attribute value | [less-than-in-value](../../conformance/syntax-errors/less-than-in-value.holoml) |
| `null-character` | The null character | [null-character](../../conformance/syntax-errors/null-character.holoml), [null-in-comment](../../conformance/syntax-errors/null-in-comment.holoml) |
| `too-deep` | An element nested more than 256 deep | [too-deep](../../conformance/syntax-errors/too-deep.holoml) |

## Problems

| Code | Meaning | Samples |
|---|---|---|
| `wrong-root` | The root element is not `holoml` | [wrong-root](../../conformance/problems/wrong-root.holoml) |
| `unsupported-version` | The `version` is not one the reader knows | [unsupported-version](../../conformance/problems/unsupported-version.holoml) |
| `unknown-element` | An element that is not in the page's HoloML version | [inherited-names](../../conformance/problems/inherited-names.holoml), [newer-than-declared](../../conformance/problems/newer-than-declared.holoml), [unknown-element](../../conformance/problems/unknown-element.holoml) |
| `child-not-allowed` | An element where it may not stand | [bad-choice](../../conformance/problems/bad-choice.holoml), [bad-click-actions](../../conformance/problems/bad-click-actions.holoml), [bad-slider](../../conformance/problems/bad-slider.holoml), [bad-values](../../conformance/problems/bad-values.holoml), [bad-water](../../conformance/problems/bad-water.holoml), [child-not-allowed](../../conformance/problems/child-not-allowed.holoml), [hud-in-group](../../conformance/problems/hud-in-group.holoml) |
| `text-not-allowed` | Text in an element that holds none (text belongs in `title`, `label`, and (0.2) `hud`, `slider`, `option`, and `panel`) | [inline-script](../../conformance/problems/inline-script.holoml), [text-not-allowed](../../conformance/problems/text-not-allowed.holoml) |
| `empty-text` | An element that holds text, with none (a `hud` may be empty) | [bad-choice](../../conformance/problems/bad-choice.holoml), [bad-click-actions](../../conformance/problems/bad-click-actions.holoml), [bad-slider](../../conformance/problems/bad-slider.holoml), [empty-text](../../conformance/problems/empty-text.holoml) |
| `too-many` | A second `head`, `scene`, `title`, (0.1) `viewpoint`, or (0.2) `plan` | [bad-click-actions](../../conformance/problems/bad-click-actions.holoml), [bad-water](../../conformance/problems/bad-water.holoml), [too-many](../../conformance/problems/too-many.holoml) |
| `missing-child` | `holoml` without a `scene` | [bad-choice](../../conformance/problems/bad-choice.holoml), [missing-child](../../conformance/problems/missing-child.holoml) |
| `wrong-order` | `head` after `scene` | [wrong-order](../../conformance/problems/wrong-order.holoml) |
| `unknown-attribute` | An attribute the element does not have | [inherited-names](../../conformance/problems/inherited-names.holoml), [newer-than-declared](../../conformance/problems/newer-than-declared.holoml), [unknown-attribute](../../conformance/problems/unknown-attribute.holoml) |
| `missing-attribute` | A required attribute is missing, or (0.2) one that another needs: a choice's `target` and `material` go together, a click action's `trigger`, `toggle`, and `label` need `begin="click"`, an animation that begins on a click needs a `trigger` when its target cannot be clicked, and a sound always does, each of several viewpoints needs an `id`, and a group's `near` needs `load="near"` | [bad-choice](../../conformance/problems/bad-choice.holoml), [bad-click-actions](../../conformance/problems/bad-click-actions.holoml), [bad-loading-by-area](../../conformance/problems/bad-loading-by-area.holoml), [bad-water](../../conformance/problems/bad-water.holoml), [missing-attribute](../../conformance/problems/missing-attribute.holoml) |
| `bad-value` | A value of the wrong kind, or out of range | [address-characters](../../conformance/problems/address-characters.holoml), [bad-02-values](../../conformance/problems/bad-02-values.holoml), [bad-choice](../../conformance/problems/bad-choice.holoml), [bad-click-actions](../../conformance/problems/bad-click-actions.holoml), [bad-loading-by-area](../../conformance/problems/bad-loading-by-area.holoml), [bad-numbers](../../conformance/problems/bad-numbers.holoml), [bad-slider](../../conformance/problems/bad-slider.holoml), [bad-times](../../conformance/problems/bad-times.holoml), [bad-values](../../conformance/problems/bad-values.holoml), [bad-water](../../conformance/problems/bad-water.holoml), [empty-values](../../conformance/problems/empty-values.holoml), [identifier-spaces](../../conformance/problems/identifier-spaces.holoml), [inherited-names](../../conformance/problems/inherited-names.holoml), [newer-than-declared](../../conformance/problems/newer-than-declared.holoml), [other-spaces](../../conformance/problems/other-spaces.holoml), [overflow](../../conformance/problems/overflow.holoml) |
| `attribute-not-for-type` | A light attribute its type does not use | [attribute-not-for-type](../../conformance/problems/attribute-not-for-type.holoml), [bad-choice](../../conformance/problems/bad-choice.holoml) |
| `duplicate-id` | Two elements with the same id | [duplicate-id](../../conformance/problems/duplicate-id.holoml) |
| `unknown-target` | An id reference (an `animate` target, (0.2) a trigger, a choice's target) that no element has | [bad-choice](../../conformance/problems/bad-choice.holoml), [bad-click-actions](../../conformance/problems/bad-click-actions.holoml), [unknown-target](../../conformance/problems/unknown-target.holoml) |
| `bad-target` | An attribute that cannot be animated on that element, or (0.2) a trigger that cannot be clicked, or a choice's target that is not a model | [animated-light-targets](../../conformance/problems/animated-light-targets.holoml), [bad-choice](../../conformance/problems/bad-choice.holoml), [bad-click-actions](../../conformance/problems/bad-click-actions.holoml), [bad-target](../../conformance/problems/bad-target.holoml) |
| `nested-link` | A link inside another link | [nested-link](../../conformance/problems/nested-link.holoml) |
| `unsafe-link` | An address with a scheme other than http or https | [address-characters](../../conformance/problems/address-characters.holoml), [unsafe-link](../../conformance/problems/unsafe-link.holoml) |
