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
    return report.issues.map((issue) => ({
      fileName: issue.location.file,
      issues: [issue],
      metrics: {
        aiSignalClarityScore: report.summary.score,
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
      summary: output.summary,
      aggregateSignals: output.metadata?.aggregateSignals ?? {},
      results: [],
    } as AiSignalClarityReport;
    return calculateAiSignalClarityScore(report);
  },
});
