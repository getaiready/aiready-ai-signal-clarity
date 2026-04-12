import { describe, it, expect } from 'vitest';
import { performSignalClarityScan } from '../scanner';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('Redundant Type Constants', () => {
  it('should flag redundant type constants in TypeScript', async () => {
    const testFile = join(process.cwd(), 'test-redundant-constants.ts');
    const content = `
      const TYPE_STRING = 'string';
      const TYPE_OBJECT = 'object';
      const OTHER_CONST = 'something-else';
      
      const schema = {
        type: TYPE_OBJECT,
        properties: {
          name: { type: TYPE_STRING }
        }
      };
    `;

    writeFileSync(testFile, content);

    try {
      const result = await performSignalClarityScan(testFile);
      const redundantIssues = result.issues.filter(
        (i) => i.category === 'redundant-type-constant'
      );

      expect(redundantIssues).toHaveLength(2);
      expect(redundantIssues[0].message).toContain('TYPE_STRING');
      expect(redundantIssues[1].message).toContain('TYPE_OBJECT');
    } finally {
      unlinkSync(testFile);
    }
  });

  it('should not flag non-type constants', async () => {
    const testFile = join(process.cwd(), 'test-normal-constants.ts');
    const content = `
      const API_URL = 'https://api.example.com';
      const MAX_RETRIES = 3;
    `;

    writeFileSync(testFile, content);

    try {
      const result = await performSignalClarityScan(testFile);
      const redundantIssues = result.issues.filter(
        (i) => i.category === 'redundant-type-constant'
      );

      expect(redundantIssues).toHaveLength(0);
    } finally {
      unlinkSync(testFile);
    }
  });
});
