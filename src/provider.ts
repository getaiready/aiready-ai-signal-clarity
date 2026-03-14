import {
  ToolProvider,
  ToolName,
  SpokeOutput,
  ScanOptions,
  ToolScoringOutput,
  SpokeOutputSchema,
  groupIssuesByFile,
  buildSimpleProviderScore,
} from '@aiready/core';
import { analyzeDeps } from './analyzer';
import { DepsOptions } from './types';

/**
 * Dependency Health Tool Provider
 */
export const DepsProvider: ToolProvider = {
  id: ToolName.DependencyHealth,
  alias: ['deps', 'deps-health', 'packages'],

  async analyze(options: ScanOptions): Promise<SpokeOutput> {
    const report = await analyzeDeps(options as DepsOptions);
    return SpokeOutputSchema.parse({
      results: groupIssuesByFile(report.issues),
      summary: report.summary,
      metadata: {
        toolName: ToolName.DependencyHealth,
        version: '0.9.5',
        timestamp: new Date().toISOString(),
        rawData: report.rawData,
      },
    });
  },

  score(output: SpokeOutput): ToolScoringOutput {
    const summary = output.summary as any;
    const rawData = (output.metadata as any)?.rawData || {};
    return buildSimpleProviderScore(
      ToolName.DependencyHealth,
      summary,
      rawData
    );
  },

  defaultWeight: 6,
};
