import { describe, expect, it } from 'vitest';
import { FISH } from './fish.mjs';
import { LICENCES, checkLicence, licenceProblem, stampOf } from './licence.mjs';

/** A .glb file's bytes with this `asset` and nothing else, as Sketchfab stamps its downloads. */
function glb(asset: Record<string, unknown>): Buffer {
  const text = Buffer.from(JSON.stringify({ asset }));
  const json = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  const head = Buffer.alloc(20);
  head.write('glTF', 0, 'latin1');
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(20 + json.length, 8);
  head.writeUInt32LE(json.length, 12);
  head.write('JSON', 16, 'latin1');
  return Buffer.concat([head, json]);
}

const stamped = (license: string) => glb({ version: '2.0', extras: { author: 'Someone', license, title: 'A fish' } });
const fish = (licence: string) => ({ id: 'turtle', credit: { licence } });

describe("E1: a model's own licence stamp and its credit agree (review 134)", () => {
  it('reads the stamp a file carries, and none from a file without one', () => {
    expect(stampOf(stamped('CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)'))).toBe('CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)');
    expect(stampOf(glb({ version: '2.0', generator: 'a tool' }))).toBeNull();
    expect(stampOf(glb({ version: '2.0', extras: { license: '  ' } }))).toBeNull();
    expect(() => stampOf(Buffer.from('not a model'))).toThrow(/not a binary glTF file/);
  });

  it('stops at the turtle that was credited CC BY 4.0 while its file said non-commercial', () => {
    const file = stamped('CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/)');
    expect(() => checkLicence(fish('CC BY 4.0'), file)).toThrow(
      'turtle: the file\'s own licence stamp is "CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/)" (non-commercial), but tools/fish.mjs credits it as CC BY 4.0. Every model must be CC BY 4.0 or CC0: choose another model.',
    );
  });

  it('refuses every condition the examples do not take, however the stamp writes it', () => {
    for (const [stamp, word] of [
      ['CC-BY-NC-4.0', 'non-commercial'],
      ['CC-BY-ND-4.0 (http://creativecommons.org/licenses/by-nd/4.0/)', 'no derivatives'],
      ['CC-BY-SA-4.0 (http://creativecommons.org/licenses/by-sa/4.0/)', 'share alike'],
      ['CC-BY-NC-SA-4.0', 'non-commercial, share alike'],
      ['cc by-nc-nd 4.0', 'non-commercial, no derivatives'],
      // Named in the address alone.
      ['Creative Commons (http://creativecommons.org/licenses/by-nc/4.0/)', 'non-commercial'],
    ] as const) {
      expect(licenceProblem('a-fish', 'CC BY 4.0', stamp), stamp).toContain(`(${word})`);
    }
  });

  it('stops when the stamp and the credit are different licences, though each is allowed', () => {
    expect(licenceProblem('a-fish', 'CC BY 4.0', 'CC0-1.0 (http://creativecommons.org/publicdomain/zero/1.0/)')).toMatch(/Correct the credit/);
    expect(licenceProblem('a-fish', 'CC0 1.0', 'CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)')).toMatch(/Correct the credit/);
    expect(licenceProblem('a-fish', 'CC BY 4.0', 'CC-BY-3.0')).toMatch(/Correct the credit/);
    expect(licenceProblem('a-fish', 'CC BY 4.0', 'Standard licence')).toMatch(/Correct the credit/);
  });

  it('stops at a credit that is not CC BY 4.0 or CC0, stamp or no stamp', () => {
    expect(licenceProblem('a-fish', 'CC BY-NC 4.0', null)).toMatch(/credits it as "CC BY-NC 4\.0", which is not CC BY 4\.0 or CC0 1\.0/);
    expect(licenceProblem('a-fish', 'CC BY-SA 4.0', 'CC-BY-SA-4.0')).toMatch(/which is not/);
    expect(licenceProblem('a-fish', 'toString', null)).toMatch(/which is not/);
  });

  it('passes a file whose stamp is its credit, and one without a stamp', () => {
    expect(licenceProblem('a-fish', 'CC BY 4.0', 'CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)')).toBeNull();
    expect(licenceProblem('a-fish', 'CC0 1.0', 'CC0-1.0 (http://creativecommons.org/publicdomain/zero/1.0/)')).toBeNull();
    expect(licenceProblem('a-fish', 'CC BY 4.0', null)).toBeNull();
    expect(() => checkLicence(fish('CC BY 4.0'), stamped('CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)'))).not.toThrow();
  });

  it("every fish's credit is CC BY 4.0 or CC0, and none is the old turtle", () => {
    expect(FISH.length).toBe(9);
    for (const f of FISH as { id: string; url: string; credit: { licence: string; author: string } }[]) {
      expect(Object.keys(LICENCES), f.id).toContain(f.credit.licence);
      expect(f.credit.author, f.id).not.toBe('DigitalLife3D');
      expect(f.url, f.id).not.toContain('442372b7f02b4730882d41d959726156');
    }
  });
});
