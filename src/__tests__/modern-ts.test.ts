import { describe, it, expect, beforeEach } from 'vitest';
import { performSignalClarityScan } from '../scanner';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('Modern TS Support', () => {
  const testFile = join(__dirname, 'test-modern.ts');

  it('should parse and scan files with decorators', async () => {
    const code = `
      function sealed(constructor: Function) {
        Object.seal(constructor);
        Object.seal(constructor.prototype);
      }

      @sealed
      export class BugReport {
        type = 'report';
        title: string;

        constructor(t: string) {
          this.title = t;
        }
      }
    `;
    writeFileSync(testFile, code);

    try {
      const result = await performSignalClarityScan(testFile);
      expect(result.issues).toBeDefined();
      // Should not crash and should find exports
      expect(result.signals.totalExports).toBe(1);
    } finally {
      unlinkSync(testFile);
    }
  });

  it('should parse and scan files with explicit resource management', async () => {
    const code = `
      export async function handle() {
        const getResource = () => ({ [Symbol.asyncDispose]: async () => {} });
        await using resource = getResource();
        return true;
      }
    `;
    writeFileSync(testFile, code);

    try {
      const result = await performSignalClarityScan(testFile);
      expect(result.issues).toBeDefined();
      expect(result.signals.totalExports).toBe(1);
    } finally {
      unlinkSync(testFile);
    }
  });

  it('should handle BigInt literals in return statements without magic literal penalty if ignored', async () => {
    const code = `
      export function getLimit() {
        return 100n; // 100n is in infrastructureIgnores
      }
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
});
