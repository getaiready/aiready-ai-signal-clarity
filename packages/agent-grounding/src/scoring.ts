import { ToolName, buildStandardToolScore } from '@aiready/core';
import type { AgentGroundingReport } from './types';

/**
 * Convert agent grounding report into a ToolScoringOutput.
 */
export function calculateGroundingScore(report: AgentGroundingReport): any {
  const { summary, rawData, recommendations } = report;

  return buildStandardToolScore({
    toolName: ToolName.AgentGrounding,
    score: summary.score,
    rawData,
    dimensions: {
      structureClarityScore: summary.dimensions.structureClarityScore,
      selfDocumentationScore: summary.dimensions.selfDocumentationScore,
      entryPointScore: summary.dimensions.entryPointScore,
      apiClarityScore: summary.dimensions.apiClarityScore,
      domainConsistencyScore: summary.dimensions.domainConsistencyScore,
    },
    dimensionNames: {
      structureClarityScore: 'Structure Clarity',
      selfDocumentationScore: 'Self-Documentation',
      entryPointScore: 'Entry Points',
      apiClarityScore: 'API Clarity',
      domainConsistencyScore: 'Domain Consistency',
    },
    recommendations,
    recommendationImpact: 6,
    rating: summary.rating,
  });
}
