# Showroom example

A small HoloML 0.1 example: three cars in three colours that you orbit
around (index.holoml), and a page to walk around one of them
(car.holoml). The real car showroom is a later milestone.

The car is a placeholder made of boxes, written by make-model.mjs so the
example uses no third-party model:

```
node examples/showroom/make-model.mjs
```

The unit tests check that both pages are valid HoloML 0.1.
