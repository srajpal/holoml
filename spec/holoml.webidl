// HoloML 0.2: the scene API (SPEC.md section 10), in Web IDL. A page's
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
  // setting null is an error (a TypeError).
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
