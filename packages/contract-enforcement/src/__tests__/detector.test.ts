import { describe, it, expect } from 'vitest';
import { detectDefensivePatterns } from '../detector';

describe('detectDefensivePatterns', () => {
  const filePath = '/test/file.ts';

  it('detects `as any` type assertions', () => {
    const code = `
      function foo(x: unknown) {
        const y = x as any;
        return y.bar;
      }
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['as-any']).toBe(1);
    expect(result.issues[0].pattern).toBe('as-any');
  });

  it('detects `as unknown as` double casts', () => {
    const code = `
      const x = data as unknown as Foo;
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['as-unknown']).toBe(1);
  });

  it('detects deep optional chaining (depth >= 3)', () => {
    const code = `
      const val = obj?.foo?.bar?.baz;
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['deep-optional-chain']).toBe(1);
  });

  it('does not flag shallow optional chaining (depth < 3)', () => {
    const code = `
      const val = obj?.foo?.bar;
    `;
    const result = detectDefensivePatterns(filePath, code, 3);
    expect(result.counts['deep-optional-chain']).toBe(0);
  });

  it('detects nullish coalescing with literal default', () => {
    const code = `
      const x = value ?? 'default';
      const y = count ?? 0;
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['nullish-literal-default']).toBe(2);
  });

  it('does not flag nullish coalescing with variable', () => {
    const code = `
      const x = value ?? fallback;
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['nullish-literal-default']).toBe(0);
  });

  it('detects swallowed errors (empty catch)', () => {
    const code = `
      try {
        doSomething();
      } catch {}
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['swallowed-error']).toBe(1);
  });

  it('detects swallowed errors (console.log only)', () => {
    const code = `
      try {
        doSomething();
      } catch (e) {
        console.log(e);
      }
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['swallowed-error']).toBe(1);
  });

  it('does not flag console.error as swallowed', () => {
    const code = `
      try {
        doSomething();
      } catch (e) {
        console.error(e);
      }
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['swallowed-error']).toBe(0);
  });

  it('does not flag catch blocks with real handling', () => {
    const code = `
      try {
        doSomething();
      } catch (e) {
        handleError(e);
        throw e;
      }
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['swallowed-error']).toBe(0);
  });

  it('detects process.env fallbacks', () => {
    const code = `
      const region = process.env.AWS_REGION || 'us-east-1';
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['env-fallback']).toBe(1);
  });

  it('detects `any` parameter types', () => {
    const code = `
      function handler(data: any): string {
        return data.value;
      }
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['any-parameter']).toBe(1);
  });

  it('detects `any` return types', () => {
    const code = `
      function parse(raw: string): any {
        return JSON.parse(raw);
      }
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['any-return']).toBe(1);
  });

  it('handles invalid code gracefully', () => {
    const code = `this is not valid typescript {{{`;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.totalLines).toBeGreaterThan(0);
    expect(result.issues).toHaveLength(0);
  });

  it('detects multiple patterns in one file', () => {
    const code = `
      function process(data: any): any {
        const val = data?.foo?.bar?.baz ?? 'fallback';
        const region = process.env.REGION || 'ap-southeast-2';
        try {
          return val;
        } catch {}
      }
    `;
    const result = detectDefensivePatterns(filePath, code);
    expect(result.counts['any-parameter']).toBe(1);
    expect(result.counts['any-return']).toBe(1);
    expect(result.counts['deep-optional-chain']).toBe(1);
    expect(result.counts['nullish-literal-default']).toBe(1);
    expect(result.counts['env-fallback']).toBe(1);
    expect(result.counts['swallowed-error']).toBe(1);
  });
});
