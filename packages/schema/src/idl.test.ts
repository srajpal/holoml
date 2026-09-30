import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../../', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, root), 'utf8').replace(/\r\n/g, '\n');
const spec = read('SPEC.md');
const idl = read('spec/holoml.webidl');

/** The Web IDL's interfaces and dictionaries: each one's parent and own members. */
function definitions(): Map<string, { parent: string | null; members: string[] }> {
  const out = new Map<string, { parent: string | null; members: string[] }>();
  const text = idl.replace(/\/\/[^\n]*/g, '');
  for (const m of text.matchAll(/(?:interface|dictionary)\s+(\w+)(?:\s*:\s*(\w+))?\s*\{([^}]*)\};/g)) {
    const members = m[3]!
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith('(') ? s.split(/\s+/).pop()! : /(\w+)\s*\(/.exec(s)?.[1] ?? s.split(/\s+/).pop()!));
    out.set(m[1]!, { parent: m[2] ?? null, members });
  }
  return out;
}

/** The text of a section of SPEC.md, from its heading to the next heading of the same or a higher level. */
function section(heading: string): string {
  const start = spec.indexOf(`\n${heading}\n`);
  const rest = spec.slice(start + heading.length + 2);
  const next = rest.search(/\n#{1,3} /);
  return next < 0 ? rest : rest.slice(0, next);
}

const rows = (text: string) =>
  text
    .split('\n')
    .filter((l) => l.startsWith('| `'))
    .map((l) => l.split('|').map((c) => c.trim()));
const names = (cell: string) => [...cell.matchAll(/`(?:holoml\.)?(\w+)/g)].map((m) => m[1]!);

const KIND = { model: 'ModelThing', group: 'GroupThing', light: 'LightThing', label: 'LabelThing', panel: 'PanelThing', sound: 'SoundThing', hud: 'HudThing', slider: 'SliderThing', choice: 'ChoiceThing' } as const;

describe('Y3: the scene API in Web IDL and in the tables (browser milestone 22)', () => {
  const defs = definitions();
  const has = (name: string, member: string): boolean => {
    const d = defs.get(name);
    return !!d && (d.members.includes(member) || (d.parent !== null && has(d.parent, member)));
  };

  it('the holoml object has the members its table lists', () => {
    const table = rows(section('### The `holoml` object')).flatMap((r) => names(r[1]!));
    expect(defs.get('HoloML')!.members.sort()).toEqual([...new Set(table)].sort());
  });

  it('the viewer has the members its table lists', () => {
    const table = rows(section('### The viewer')).flatMap((r) => names(r[1]!));
    expect(defs.get('HoloMLViewer')!.members.sort()).toEqual([...new Set(table)].sort());
  });

  it("each kind of thing has the members the things' table gives it, and no others", () => {
    const table = rows(section('### Things'));
    const listed = new Map<string, Set<string>>([['Thing', new Set()], ...Object.values(KIND).map((k) => [k, new Set<string>()] as [string, Set<string>])]);
    for (const r of table) {
      const members = names(r[1]!);
      const kinds = r[2]!.split(',').map((k) => k.trim());
      for (const kind of kinds) {
        const iface = kind === 'all' ? 'Thing' : KIND[kind as keyof typeof KIND];
        expect(iface, `the kind "${kind}"`).toBeDefined();
        for (const member of members) {
          expect(has(iface, member), `${iface}.${member}`).toBe(true);
          listed.get(iface)!.add(member);
        }
      }
    }
    for (const [iface, members] of listed) {
      const inherited = iface === 'Thing' ? new Set<string>() : listed.get('Thing')!;
      const own = defs.get(iface)!.members.filter((m) => !inherited.has(m));
      expect(own.filter((m) => !members.has(m)), `${iface}: members the table does not give it`).toEqual([]);
    }
  });

  it('an event has its type and the members the events table lists', () => {
    const table = rows(section('### Events')).flatMap((r) => names(r[3]!));
    expect(defs.get('HoloMLEvent')!.members.sort()).toEqual([...new Set(['type', ...table])].sort());
  });
});
