import { describe, it, expect, vi } from 'vitest';
import { testabilityAction } from '../testability';

vi.mock('@aiready/testability', () => ({
  analyzeTestability: vi.fn().mockResolvedValue({
    summary: {
      score: 80,
      rating: 'good',
      aiChangeSafetyRating: 'safe',
      coverageRatio: 0.5,
    },
    rawData: { testFiles: 5, sourceFiles: 10 },
  }),
  calculateTestabilityScore: vi.fn().mockReturnValue({ score: 80 }),
}));

vi.mock('@aiready/core', () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
  mergeConfigWithDefaults: vi
    .fn()
    .mockImplementation((c, d) => ({ ...d, ...c })),
}));

describe('Testability CLI Action', () => {
  it('should run analysis and return scoring in json mode', async () => {
    const result = await testabilityAction('.', { output: 'json' });
    expect(result?.score).toBe(80);
  });

  it('should run analysis and print to console in default mode', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await testabilityAction('.', { output: 'console' });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
