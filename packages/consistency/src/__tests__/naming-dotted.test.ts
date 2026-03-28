import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { analyzeNamingGeneralized } from '../analyzers/naming-generalized';
import { join } from 'path';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('Naming Analysis - Dotted Identifiers', () => {
  const tmpDir = join(tmpdir(), 'aiready-consistency-dotted-tests');

  beforeAll(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function createTestFile(name: string, content: string): string {
    const filePath = join(tmpDir, name);
    writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  it('should NOT flag dotted identifiers in Python imports', async () => {
    const file = createTestFile(
      'library_test.py',
      `
import urllib.parse
import pytrends.request

def analyze():
    pass
`
    );

    const issues = await analyzeNamingGeneralized([file]);

    // urllib.parse and pytrends.request should be ignored because they contain dots
    const namingIssues = issues.filter(
      (i) => i.type === 'naming-inconsistency'
    );
    expect(namingIssues.length).toBe(0);
  });

  it('should still flag inconsistent top-level names without dots', async () => {
    const file = createTestFile(
      'bad_naming.py',
      `
def BadNamingConvention():
    pass

user_Name = "John"
`
    );

    const issues = await analyzeNamingGeneralized([file]);
    const namingIssues = issues.filter(
      (i) => i.type === 'naming-inconsistency'
    );

    // BadNamingConvention (PascalCase for function) and user_Name (MixedCase) should be flagged
    expect(namingIssues.length).toBeGreaterThanOrEqual(1);
  });
});
