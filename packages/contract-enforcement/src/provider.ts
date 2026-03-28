import { createProvider, ToolName, groupIssuesByFile } from '@aiready/core';
import type { ScanOptions, AnalysisResult, SpokeOutput } from '@aiready/core';
import { analyzeContractEnforcement } from './analyzer';
import { calculateContractEnforcementScore } from './scoring';
import type {
  ContractEnforcementOptions,
  ContractEnforcementReport,
} from './types';

export const ContractEnforcementProvider = createProvider({
  id: ToolName.ContractEnforcement,
  alias: ['contract', 'ce', 'enforcement'],
  version: '0.1.0',
  defaultWeight: 10,

  async analyzeReport(options: ScanOptions) {
    return analyzeContractEnforcement(options as ContractEnforcementOptions);
  },

  getResults(report: ContractEnforcementReport): AnalysisResult[] {
    return groupIssuesByFile(report.issues);
  },

  getSummary(report: ContractEnforcementReport) {
    return report.summary;
  },

  getMetadata(report: ContractEnforcementReport) {
    return { rawData: report.rawData };
  },

  score(output: SpokeOutput, _options: ScanOptions) {
    const rawData = output.metadata?.rawData ?? {};
    const result = calculateContractEnforcementScore(
      rawData,
      rawData.totalLines ?? 1,
      rawData.sourceFiles ?? 1
    );
    return {
      toolName: ToolName.ContractEnforcement,
      score: result.score,
      rating: result.rating,
      recommendations: result.recommendations.map((action) => ({
        action,
        estimatedImpact: 10,
        priority: 'medium' as const,
      })),
      dimensions: result.dimensions,
      rawMetrics: rawData,
      factors: [],
    };
  },
});
