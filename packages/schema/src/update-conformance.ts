/**
 * Writes each conformance sample's .expected.json from what this
 * implementation produces (pnpm conformance:update). Run it after adding
 * a sample, then read every changed file before committing: the expected
 * results are the specification's, and this only saves typing them.
 */
import { writeFileSync } from 'node:fs';
import { actual, expectedFor, samples } from './conformance.ts';

let written = 0;
for (const sample of samples()) {
  const next = JSON.stringify(expectedFor(sample.group, actual(sample.text)), null, 2) + '\n';
  const before = sample.expected ? JSON.stringify(sample.expected, null, 2) + '\n' : '';
  if (next !== before) {
    writeFileSync(sample.path.replace(/\.holoml$/, '.expected.json'), next);
    console.log(`wrote ${sample.group}/${sample.name}.expected.json`);
    written += 1;
  }
}
console.log(`${written} file(s) written`);
