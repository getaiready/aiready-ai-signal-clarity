import {
  calculateAiSignalClarity,
  ToolName,
  buildStandardToolScore,
} from '@aiready/core';
import type { ToolScoringOutput } from '@aiready/core';
import type { AiSignalClarityReport } from './types';

/**
 * Convert AI signal clarity report into a ToolScoringOutput
 * suitable for inclusion in the unified AIReady score.
 *
 * Note: The risk score from core is 0-100 where higher = more risk.
 * We invert it so the spoke score is 0-100 where higher = better.
 */
export function calculateAiSignalClarityScore(
  report: AiSignalClarityReport
): ToolScoringOutput {
  const { aggregateSignals } = report;

  const riskResult = calculateAiSignalClarity({
    overloadedSymbols: aggregateSignals.overloadedSymbols,
    magicLiterals: aggregateSignals.magicLiterals,
    booleanTraps: aggregateSignals.booleanTraps,
    implicitSideEffects: aggregateSignals.implicitSideEffects,
    deepCallbacks: aggregateSignals.deepCallbacks,
    ambiguousNames: aggregateSignals.ambiguousNames,
    undocumentedExports: aggregateSignals.undocumentedExports,
    largeFiles: aggregateSignals.largeFiles,
    totalSymbols: Math.max(1, aggregateSignals.totalSymbols),
    totalExports: Math.max(1, aggregateSignals.totalExports),
  });

  // Invert: high risk = low score
  const score = Math.max(0, 100 - riskResult.score);

  return buildStandardToolScore({
    toolName: ToolName.AiSignalClarity,
    score,
    rawData: {
      riskScore: riskResult.score,
      rating: riskResult.rating,
      topRisk: riskResult.topRisk,
      ...aggregateSignals,
    },
    dimensions: riskResult.dimensions,
    dimensionNames: {
      overloadingScore: 'Symbol Overloading',
      magicLiteralScore: 'Magic Literals',
      booleanTrapScore: 'Boolean Traps',
      implicitSideEffectScore: 'Implicit Side Effects',
      deepCallbackScore: 'Deep Callbacks',
      ambiguityScore: 'Naming Ambiguity',
      documentationScore: 'API Documentation',
      sizeScore: 'File Sizing',
    },
    recommendations: riskResult.recommendations,
    rating: riskResult.rating,
  });
}
