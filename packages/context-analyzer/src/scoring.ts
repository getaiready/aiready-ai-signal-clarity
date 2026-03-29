import {
  calculateMonthlyCost,
  calculateProductivityImpact,
  DEFAULT_COST_CONFIG,
  type CostConfig,
  ToolName,
  getRatingSlug,
} from '@aiready/core';
import type { ToolScoringOutput } from '@aiready/core';
import type { ContextSummary } from './types';

/**
 * Thresholds and weights for context efficiency scoring.
 */
const BUDGET_EXCELLENT_THRESHOLD = 8000;
const BUDGET_PENALTY_RATE = 200;
const DEPTH_EXCELLENT_THRESHOLD = 8;
const DEPTH_PENALTY_WEIGHT = 5;
const FRAGMENTATION_EXCELLENT_THRESHOLD = 0.5;
const FRAGMENTATION_PENALTY_WEIGHT = 100;
const MAX_CRITICAL_PENALTY = 20;
const CRITICAL_ISSUE_WEIGHT = 3;
const MAX_MAJOR_PENALTY = 15;
const MAJOR_ISSUE_WEIGHT = 1;
const EXTREME_FILE_THRESHOLD = 15000;
const MAX_EXTREME_PENALTY = 20;
const EXTREME_PENALTY_DIVISOR = 500;
const FRAGMENTATION_BONUS_THRESHOLD = 0.2;
const ORGANIZATION_BONUS = 5;
const MAX_TOTAL_PENALTY = 30;

const WEIGHT_BUDGET = 0.35;
const WEIGHT_DEPTH = 0.25;
const WEIGHT_FRAGMENTATION = 0.25;

/**
 * Calculate AI Readiness Score for context efficiency (0-100).
 *
 * Evaluates how efficiently an AI model can process the project's code context
 * based on token budgets, import depth, and file fragmentation.
 *
 * @param summary - Consolidated context summary from the scan.
 * @param costConfig - Optional configuration for business value calculations.
 * @returns Standardized scoring output for the context analyzer tool.
 * @lastUpdated 2026-03-18
 */
export function calculateContextScore(
  summary: ContextSummary,
  costConfig?: Partial<CostConfig>
): ToolScoringOutput {
  const {
    avgContextBudget = 0,
    maxContextBudget = 0,
    avgImportDepth = 0,
    maxImportDepth = 0,
    avgFragmentation = 0.5, // neutral
    criticalIssues = 0,
    majorIssues = 0,
    totalFiles = 0,
  } = summary || {};

  // More reasonable thresholds for modern codebases
  const budgetScore =
    avgContextBudget < BUDGET_EXCELLENT_THRESHOLD
      ? 100
      : Math.max(
          0,
          100 -
            (avgContextBudget - BUDGET_EXCELLENT_THRESHOLD) /
              BUDGET_PENALTY_RATE
        );

  const depthScore =
    avgImportDepth < DEPTH_EXCELLENT_THRESHOLD
      ? 100
      : Math.max(
          0,
          100 -
            (avgImportDepth - DEPTH_EXCELLENT_THRESHOLD) * DEPTH_PENALTY_WEIGHT
        );

  const fragmentationScore =
    avgFragmentation < FRAGMENTATION_EXCELLENT_THRESHOLD
      ? 100
      : Math.max(
          0,
          100 -
            (avgFragmentation - FRAGMENTATION_EXCELLENT_THRESHOLD) *
              FRAGMENTATION_PENALTY_WEIGHT
        );

  // Cap penalties to prevent score going to 0
  const criticalPenalty = Math.min(
    MAX_CRITICAL_PENALTY,
    criticalIssues * CRITICAL_ISSUE_WEIGHT
  );
  const majorPenalty = Math.min(
    MAX_MAJOR_PENALTY,
    majorIssues * MAJOR_ISSUE_WEIGHT
  );

  const maxBudgetPenalty =
    maxContextBudget > EXTREME_FILE_THRESHOLD
      ? Math.min(
          MAX_EXTREME_PENALTY,
          (maxContextBudget - EXTREME_FILE_THRESHOLD) / EXTREME_PENALTY_DIVISOR
        )
      : 0;

  // Add bonus for well-organized codebases
  let bonus = 0;
  if (
    criticalIssues === 0 &&
    majorIssues === 0 &&
    avgFragmentation < FRAGMENTATION_BONUS_THRESHOLD
  ) {
    bonus = ORGANIZATION_BONUS;
  }

  const rawScore =
    budgetScore * WEIGHT_BUDGET +
    depthScore * WEIGHT_DEPTH +
    fragmentationScore * WEIGHT_FRAGMENTATION +
    bonus;
  const finalScore =
    rawScore -
    Math.min(MAX_TOTAL_PENALTY, criticalPenalty + majorPenalty) -
    maxBudgetPenalty;

  const score = Math.max(0, Math.min(100, Math.round(finalScore)));

  const factors = [
    {
      name: 'Context Budget',
      impact: Math.round(budgetScore * WEIGHT_BUDGET - WEIGHT_BUDGET * 100),
      description: `Avg ${Math.round(avgContextBudget)} tokens per file ${avgContextBudget < BUDGET_EXCELLENT_THRESHOLD ? '(excellent)' : avgContextBudget < 12000 ? '(acceptable)' : '(high)'}`,
    },
    {
      name: 'Import Depth',
      impact: Math.round(depthScore * WEIGHT_DEPTH - WEIGHT_DEPTH * 100),
      description: `Avg ${avgImportDepth.toFixed(1)} levels ${avgImportDepth < DEPTH_EXCELLENT_THRESHOLD ? '(excellent)' : avgImportDepth < 12 ? '(acceptable)' : '(deep)'}`,
    },
    {
      name: 'Fragmentation',
      impact: Math.round(
        fragmentationScore * WEIGHT_FRAGMENTATION - WEIGHT_FRAGMENTATION * 100
      ),
      description: `${(avgFragmentation * 100).toFixed(0)}% fragmentation ${avgFragmentation < 0.3 ? '(well-organized)' : avgFragmentation < 0.5 ? '(moderate)' : '(high)'}`,
    },
  ];

  if (bonus > 0) {
    factors.push({
      name: 'Well-Organized Codebase',
      impact: bonus,
      description: 'No critical/major issues and low fragmentation',
    });
  }

  if (criticalIssues > 0) {
    factors.push({
      name: 'Critical Issues',
      impact: -criticalPenalty,
      description: `${criticalIssues} critical context issue${criticalIssues > 1 ? 's' : ''}`,
    });
  }

  if (majorIssues > 0) {
    factors.push({
      name: 'Major Issues',
      impact: -majorPenalty,
      description: `${majorIssues} major context issue${majorIssues > 1 ? 's' : ''}`,
    });
  }

  if (maxBudgetPenalty > 0) {
    factors.push({
      name: 'Extreme File Detected',
      impact: -Math.round(maxBudgetPenalty),
      description: `One file requires ${Math.round(maxContextBudget)} tokens (very high)`,
    });
  }

  const recommendations: ToolScoringOutput['recommendations'] = [];

  if (avgContextBudget > 12000) {
    const estimatedImpact = Math.min(
      15,
      Math.round((avgContextBudget - 12000) / 1000)
    );
    recommendations.push({
      action: 'Reduce file dependencies to lower context requirements',
      estimatedImpact,
      priority: 'high',
    });
  }

  if (avgImportDepth > 10) {
    const estimatedImpact = Math.min(
      10,
      Math.round((avgImportDepth - 10) * 1.5)
    );
    recommendations.push({
      action: 'Flatten import chains to reduce depth',
      estimatedImpact,
      priority: avgImportDepth > 15 ? 'high' : 'medium',
    });
  }

  if (avgFragmentation > 0.5) {
    const estimatedImpact = Math.min(
      12,
      Math.round((avgFragmentation - 0.5) * 40)
    );
    recommendations.push({
      action: 'Consolidate related code into cohesive modules',
      estimatedImpact,
      priority: 'medium',
    });
  }

  if (maxContextBudget > 20000) {
    recommendations.push({
      action: `Split large file (${Math.round(maxContextBudget)} tokens) into smaller modules`,
      estimatedImpact: 8,
      priority: 'high',
    });
  }

  const cfg = { ...DEFAULT_COST_CONFIG, ...costConfig };
  const estimatedMonthlyCost = calculateMonthlyCost(
    avgContextBudget * (totalFiles || 1),
    cfg
  );

  const issues = [
    ...Array(criticalIssues).fill({ severity: 'critical' as const }),
    ...Array(majorIssues).fill({ severity: 'major' as const }),
  ];
  const productivityImpact = calculateProductivityImpact(issues);

  return {
    toolName: ToolName.ContextAnalyzer,
    score,
    rawMetrics: {
      avgContextBudget: Math.round(avgContextBudget),
      maxContextBudget: Math.round(maxContextBudget),
      avgImportDepth: Math.round(avgImportDepth * 10) / 10,
      maxImportDepth,
      avgFragmentation: Math.round(avgFragmentation * 100) / 100,
      criticalIssues,
      majorIssues,
      estimatedMonthlyCost,
      estimatedDeveloperHours: productivityImpact.totalHours,
    },
    factors,
    recommendations,
  };
}

/**
 * Maps a numerical score to a human-readable rating slug.
 *
 * @param score - The 0-100 readiness score.
 * @returns A formatted rating string (e.g., "excellent", "at risk").
 */
export function mapScoreToRating(score: number): string {
  // Use core implementation to resolve duplication
  return getRatingSlug(score).replace('-', ' ');
}
