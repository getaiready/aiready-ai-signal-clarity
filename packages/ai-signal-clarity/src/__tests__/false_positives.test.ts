import { scanFile } from '../scanner';
import { join } from 'path';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('AI Signal Clarity - False Positives Verification', () => {
  const tmpDir = join(tmpdir(), 'aiready-false-positives-tests');

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

  it('should NOT flag standard CSS properties in JSX style objects', async () => {
    const file = createTestFile(
      'styles.tsx',
      `
      export const MyComponent = () => (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', marginTop: '80px' }}>
          Hello
        </div>
      );
    `
    );

    const result = await scanFile(file, {
      rootDir: tmpDir,
      minSeverity: 'info',
    });
    const issues = result.issues.filter((i) => i.category === 'magic-literal');

    // Currently these ARE flagged because they are Property values, not Attribute values
    expect(issues.length).toBe(0);
  });

  it('should NOT flag Next.js Metadata and SEO strings', async () => {
    const file = createTestFile(
      'layout.tsx',
      `
      export const metadata = {
        title: 'Oakmont Cleaning',
        description: 'Premium cleaning services',
        openGraph: {
          type: 'website',
          locale: 'en_AU',
          images: [
            {
              url: '/og-image.png',
              width: 1200,
              height: 630,
              alt: 'Oakmont Cleaning',
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
        },
      };
    `
    );

    const result = await scanFile(file, {
      rootDir: tmpDir,
      minSeverity: 'info',
    });
    const issues = result.issues.filter((i) => i.category === 'magic-literal');

    // "website", "en_AU", "summary_large_image" are currently flagged
    expect(issues.length).toBe(0);
  });

  it('should NOT flag useState(boolean) as a boolean trap', async () => {
    const file = createTestFile(
      'hooks.tsx',
      `
      import { useState } from 'react';
      export const useMyHook = () => {
        const [isLoading, setIsLoading] = useState(false);
        const [isEnabled, setIsEnabled] = useState(true);
        return { isLoading, isEnabled };
      };
    `
    );

    const result = await scanFile(file, {
      rootDir: tmpDir,
      minSeverity: 'info',
    });
    const issues = result.issues.filter((i) => i.category === 'boolean-trap');

    expect(issues.length).toBe(0);
  });

  it('should NOT flag "data" as ambiguous when initialized from .json()', async () => {
    const file = createTestFile(
      'api.ts',
      `
      export const fetchData = async () => {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
      };
    `
    );

    const result = await scanFile(file, {
      rootDir: tmpDir,
      minSeverity: 'info',
    });
    const issues = result.issues.filter((i) => i.category === 'ambiguous-name');

    expect(issues.length).toBe(0);
  });

  it('should NOT flag standard tool configurations', async () => {
    const file = createTestFile(
      'playwright.config.ts',
      `
      export default defineConfig({
        use: {
          browserName: 'chromium',
          baseURL: 'http://localhost:3000',
        },
        projects: [
          {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
          },
        ],
      });
    `
    );

    const result = await scanFile(file, {
      rootDir: tmpDir,
      minSeverity: 'info',
    });
    const issues = result.issues.filter((i) => i.category === 'magic-literal');

    // "chromium" is currently flagged
    expect(issues.length).toBe(0);
  });
});
