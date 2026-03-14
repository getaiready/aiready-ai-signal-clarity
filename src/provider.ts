import {
  createProvider,
  ToolName,
  ScanOptions,
  groupIssuesByFile,
  buildSimpleProviderScore,
} from '@aiready/core';
import { analyzeDeps } from './analyzer';
import { DepsOptions } from './types';

/**
 * Dependency Health Tool Provider
 */
export const DepsProvider = createProvider({
  id: ToolName.DependencyHealth,
  alias: ['deps', 'deps-health', 'packages'],
  version: '0.9.5',
  defaultWeight: 6,
  async analyzeReport(options: ScanOptions) {
    return analyzeDeps(options as DepsOptions);
  },
  getResults(report) {
    return groupIssuesByFile(report.issues);
  },
  getSummary(report) {
    return report.summary;
  },
  getMetadata(report) {
    return { rawData: report.rawData };
  },
  score(output) {
    const summary = output.summary as any;
    const rawData = (output.metadata as any)?.rawData || {};
    return buildSimpleProviderScore(
      ToolName.DependencyHealth,
      summary,
      rawData
    );
  },
});
