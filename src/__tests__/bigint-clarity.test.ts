import { describe, it, expect, beforeEach } from 'vitest';
import { performSignalClarityScan } from '../scanner';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('BigInt Clarity Support', () => {
  const testFile = join(__dirname, 'test-bigint.ts');

  beforeEach(() => {
    // Clean up if exists
  });

  it('should not flag common BigInt literals as magic literals', async () => {
    const code = `
      export const ZERO = 0n;
      export const ONE = 1n;
      export const TWO = 2n;
      export const TEN = 10n;
      export const MINUTE = 60n;
      export const HUNDRED = 100n;
      export const THOUSAND = 1000n;
      export const HOUR = 3600n;
      export const DAY = 86400n;
      export const MILLION = 1_000_000n;
    `;
    writeFileSync(testFile, code);

    try {
      const result = await performSignalClarityScan(testFile);
      const magicLiteralIssues = result.issues.filter(
        (i) => i.type === 'magic-literal'
      );
      expect(magicLiteralIssues).toHaveLength(0);
    } finally {
      unlinkSync(testFile);
    }
  });

  it('should flag uncommon BigInt literals as magic literals', async () => {
    const code = `
      export function x() {
        return 123456n;
      }
    `;
    writeFileSync(testFile, code);

    try {
      const result = await performSignalClarityScan(testFile);
      const magicLiteralIssues = result.issues.filter(
        (i) => i.type === 'magic-literal'
      );
      expect(magicLiteralIssues).toHaveLength(1);
      expect(magicLiteralIssues[0].message).toContain('123456n');
    } finally {
      unlinkSync(testFile);
    }
  });
});
