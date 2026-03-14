import { describe, it, expect, vi } from 'vitest';
import { DepsProvider } from '../provider';
import * as analyzer from '../analyzer';

vi.mock('../analyzer', () => ({
  analyzeDeps: vi.fn(),
}));

describe('Dependency Health Provider', () => {
  it('should analyze and return SpokeOutput', async () => {
    vi.mocked(analyzer.analyzeDeps).mockResolvedValue({
      summary: {
        filesAnalyzed: 1,
        packagesAnalyzed: 10,
        score: 95,
        rating: 'excellent',
      },
      issues: [],
      rawData: {
        totalPackages: 10,
        outdatedPackages: 0,
        deprecatedPackages: 0,
        trainingCutoffSkew: 0,
      },
      recommendations: [],
    });

    const output = await DepsProvider.analyze({ rootDir: '.' });

    expect(output.summary.filesAnalyzed).toBe(1);
    expect(output.metadata!.toolName).toBe('dependency-health');
  });

  it('should score an output', () => {
    const mockOutput = {
      summary: { score: 85, recommendations: ['Update things'] } as any,
      metadata: { rawData: {} },
      results: [],
    };

    const scoring = DepsProvider.score(mockOutput as any, { rootDir: '.' });
    expect(scoring.score).toBe(85);
    expect(scoring.recommendations[0].action).toBe('Update things');
  });
});
