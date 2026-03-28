import {
  AnalysisResult,
  createProvider,
  ToolName,
  ScanOptions,
} from '@aiready/core';
import { analyzeAiSignalClarity } from './analyzer';
import { calculateAiSignalClarityScore } from './scoring';
import { AiSignalClarityOptions, AiSignalClarityReport } from './types';

/**
 * AI Signal Clarity Tool Provider
 */
export const AiSignalClarityProvider = createProvider({
  id: ToolName.AiSignalClarity,
  alias: ['ai-signal', 'clarity', 'hallucination'],
  version: '0.9.5',
  defaultWeight: 11,
  async analyzeReport(options: ScanOptions) {
    return analyzeAiSignalClarity(options as AiSignalClarityOptions);
  },
  getResults(report): AnalysisResult[] {
    return (report.results || []).map((result) => ({
      fileName: result.filePath || '',
      issues: result.issues,
      metrics: {
        aiSignalClarityScore: report.summary.totalSignals,
      },
    }));
  },
  getSummary(report) {
    return report.summary;
  },
  getMetadata(report) {
    return { aggregateSignals: report.aggregateSignals };
  },
  score(output) {
    const report = {
      summary: {
        filesAnalyzed: output.summary?.totalFiles ?? 0,
        totalSignals: output.summary?.totalIssues ?? 0,
        criticalSignals: output.summary?.criticalIssues ?? 0,
        majorSignals: output.summary?.majorIssues ?? 0,
        minorSignals: 0,
        topRisk: '',
        rating: 'good',
      },
      aggregateSignals: output.metadata?.aggregateSignals ?? {},
      results: [],
      recommendations: [],
    } as unknown as AiSignalClarityReport;
    return calculateAiSignalClarityScore(report);
  },
});
