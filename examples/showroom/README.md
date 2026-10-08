# HoloML showroom

A small HoloML 0.3 site: five cars in a round hall, one of them on a
turntable. Choose a car to walk around it, in three colours each.

- `index.holoml`: the hall (orbit around it).
- `quellis.holoml`, `pippet.holoml`, `tallberg.holoml`, `veyl.holoml`,
  `strafe.holoml`: each car on its own (walk around it), with a page for
  each of its other colours (for example `quellis-silver.holoml`).
  The site has no scripts, so each colour is its own page, with its
  own address.
  It was written in HoloML 0.1, and moved to 0.3 so that every model
  a screen reader reaches has a name (`label`): the hall, each
  plinth, and each car on its own page. In the hall each car is
  inside its link, which the car's name already names.
- `about.holoml`: what the showroom is made of.
- `index.html`: a note for ordinary web browsers, which cannot show
  HoloML.

Published at https://srajpal.github.io/holoml/showroom/ (open
`index.holoml` there in a browser that shows HoloML, such as
[HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d)).
To try it locally, open `index.holoml` from the computer in HyperSpace
3D (Ctrl+O).

## What it is made of

- The cars are from Kenney's Car Kit (CC0); see `models/CREDITS.md`.
  Their names and facts are made up.
- The hall and the plinths were made for this showroom.
- The hall loads about 0.8 MB (the models folder is 0.7 MB; the plinth
  is loaded once per car) and draws about 13,000 triangles, well inside
  the limits a renderer may set.

## Making it again

The pages and models are written by scripts in `tools/`, run from the
repository root:

```
node examples/showroom/tools/make-hall.mjs
node examples/showroom/tools/make-pages.mjs
node examples/showroom/tools/prepare-cars.mjs "<kit>/Models/GLB format"
```

`prepare-cars.mjs` needs the Car Kit from https://kenney.nl/assets/car-kit,
unpacked. It splits each car's single palette material into Paint,
Glass, Lights, Trim, and Wheels, so a page can change the paint alone.

The unit tests check that every page is valid, that every link and
material a page names exists, that the hall stays small, and that the
models are credited.
