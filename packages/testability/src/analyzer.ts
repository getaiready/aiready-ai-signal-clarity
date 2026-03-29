import {
  scanFiles,
  calculateTestabilityIndex,
  Severity,
  IssueType,
  runBatchAnalysis,
  getParser,
  isTestFile,
  isIgnorableSourceFile,
  detectTestFramework,
} from '@aiready/core';
import { readFileSync } from 'fs';
import type {
  TestabilityOptions,
  TestabilityIssue,
  TestabilityReport,
} from './types';

// ---------------------------------------------------------------------------
// Per-file analysis
// ---------------------------------------------------------------------------

interface FileAnalysis {
  pureFunctions: number;
  totalFunctions: number;
  injectionPatterns: number;
  totalClasses: number;
  bloatedInterfaces: number;
  totalInterfaces: number;
  externalStateMutations: number;
}

async function analyzeFileTestability(filePath: string): Promise<FileAnalysis> {
  const result: FileAnalysis = {
    pureFunctions: 0,
    totalFunctions: 0,
    injectionPatterns: 0,
    totalClasses: 0,
    bloatedInterfaces: 0,
    totalInterfaces: 0,
    externalStateMutations: 0,
  };

  const parser = await getParser(filePath);
  if (!parser) return result;

  let code: string;
  try {
    code = readFileSync(filePath, 'utf-8');
  } catch {
    return result;
  }

  try {
    await parser.initialize();
    const parseResult = parser.parse(code, filePath);

    for (const exp of parseResult.exports) {
      if (exp.type === 'function') {
        result.totalFunctions++;
        if (exp.isPure) result.pureFunctions++;
        if (exp.hasSideEffects) result.externalStateMutations++;
      }

      if (exp.type === 'class') {
        result.totalClasses++;
        // Generalized DI heuristic: constructor/initializer with parameters
        if (exp.parameters && exp.parameters.length > 0) {
          result.injectionPatterns++;
        }
        // Heuristic: bloated classes
        const total = (exp.methodCount || 0) + (exp.propertyCount || 0);
        if (total > 10) {
          result.bloatedInterfaces++;
        }
      }

      if (exp.type === 'interface') {
        result.totalInterfaces++;
        // Heuristic: interfaces with many methods/props are considered bloated
        const total = (exp.methodCount || 0) + (exp.propertyCount || 0);
        if (total > 10) {
          result.bloatedInterfaces++;
        }
      }
    }
  } catch (error) {
    console.warn(`Testability: Failed to parse ${filePath}: ${error}`);
  }

  return result;
}

// Main analyzer
// ---------------------------------------------------------------------------

export async function analyzeTestability(
  options: TestabilityOptions
): Promise<TestabilityReport> {
  // Use core scanFiles which respects .gitignore recursively
  const allFiles = await scanFiles({
    ...options,
    include: options.include || ['**/*.{ts,tsx,js,jsx,py,java,cs,go}'],
    includeTests: true,
  });

  const sourceFiles = allFiles.filter(
    (f) => !isTestFile(f, options.testPatterns) && !isIgnorableSourceFile(f)
  );
  const testFiles = allFiles.filter((f) => isTestFile(f, options.testPatterns));

  const aggregated: FileAnalysis = {
    pureFunctions: 0,
    totalFunctions: 0,
    injectionPatterns: 0,
    totalClasses: 0,
    bloatedInterfaces: 0,
    totalInterfaces: 0,
    externalStateMutations: 0,
  };

  // Collect file-level details for smarter scoring
  const fileDetails: Array<{
    filePath: string;
    pureFunctions: number;
    totalFunctions: number;
  }> = [];

  await runBatchAnalysis(
    sourceFiles,
    'analyzing files',
    'testability',
    options.onProgress,
    async (f: string) => ({
      filePath: f,
      analysis: await analyzeFileTestability(f),
    }),
    (result: { filePath: string; analysis: FileAnalysis }) => {
      const a = result.analysis;
      for (const key of Object.keys(aggregated) as Array<keyof FileAnalysis>) {
        aggregated[key] += a[key];
      }
      // Collect file-level data
      fileDetails.push({
        filePath: result.filePath,
        pureFunctions: a.pureFunctions,
        totalFunctions: a.totalFunctions,
      });
    }
  );

  const hasTestFramework = detectTestFramework(options.rootDir);

  const indexResult = calculateTestabilityIndex({
    testFiles: testFiles.length,
    sourceFiles: sourceFiles.length,
    pureFunctions: aggregated.pureFunctions,
    totalFunctions: Math.max(1, aggregated.totalFunctions),
    injectionPatterns: aggregated.injectionPatterns,
    totalClasses: Math.max(1, aggregated.totalClasses),
    bloatedInterfaces: aggregated.bloatedInterfaces,
    totalInterfaces: Math.max(1, aggregated.totalInterfaces),
    externalStateMutations: aggregated.externalStateMutations,
    hasTestFramework,
    fileDetails,
  });

  // Build issues
  const issues: TestabilityIssue[] = [];
  const minCoverage = options.minCoverageRatio ?? 0.3;
  const actualRatio =
    sourceFiles.length > 0 ? testFiles.length / sourceFiles.length : 0;

  if (!hasTestFramework) {
    issues.push({
      type: IssueType.LowTestability,
      dimension: 'framework',
      severity: Severity.Critical,
      message:
        'No major testing framework detected — AI changes cannot be safely verified.',
      location: { file: options.rootDir, line: 0 },
      suggestion:
        'Add a testing framework (e.g., Jest, Pytest, JUnit) to enable automated verification.',
    });
  }

  if (actualRatio < minCoverage) {
    const needed =
      Math.ceil(sourceFiles.length * minCoverage) - testFiles.length;
    issues.push({
      type: IssueType.LowTestability,
      dimension: 'test-coverage',
      severity: actualRatio === 0 ? Severity.Critical : Severity.Major,
      message: `Test ratio is ${Math.round(actualRatio * 100)}% (${testFiles.length} test files for ${sourceFiles.length} source files). Need at least ${Math.round(minCoverage * 100)}%.`,
      location: { file: options.rootDir, line: 0 },
      suggestion: `Add ~${needed} test file(s) to reach the ${Math.round(minCoverage * 100)}% minimum for safe AI assistance.`,
    });
  }

  if (indexResult.dimensions.purityScore < 70) {
    const worstPurityFiles = (indexResult.fileMetrics || [])
      .filter((m) => !m.isEntryPoint && m.purityScore < 50)
      .sort((a, b) => a.purityScore - b.purityScore)
      .slice(0, 5);

    if (worstPurityFiles.length > 0) {
      worstPurityFiles.forEach((file) => {
        issues.push({
          type: IssueType.LowTestability,
          dimension: 'purity',
          severity: Severity.Major,
          message: `File has only ${file.purityScore}% pure functions — logic is hard for AI to verify safely.`,
          location: { file: file.filePath, line: 1 },
          suggestion:
            'Extract side-effectful logic into pure, testable functions.',
        });
      });
    } else {
      issues.push({
        type: IssueType.LowTestability,
        dimension: 'purity',
        severity: Severity.Major,
        message: `Only ${indexResult.dimensions.purityScore}% of project functions are pure — reduces AI verification safety.`,
        location: { file: options.rootDir, line: 0 },
        suggestion:
          'Promote pure function patterns to improve codebase testability.',
      });
    }
  }

  if (indexResult.dimensions.dependencyInjectionScore < 60) {
    issues.push({
      type: IssueType.LowTestability,
      dimension: 'dependency-injection',
      severity: Severity.Major,
      message: `Only ${indexResult.dimensions.dependencyInjectionScore}% of classes use dependency injection — hard to mock for AI verification.`,
      location: { file: options.rootDir, line: 0 },
      suggestion:
        'Use constructor-based dependency injection to make components mockable.',
    });
  }

  if (aggregated.bloatedInterfaces > 0) {
    issues.push({
      type: IssueType.LowTestability,
      dimension: 'interface-focus',
      severity: Severity.Minor,
      message: `Found ${aggregated.bloatedInterfaces} bloated interfaces/classes — large interfaces are harder for AI to implement correctly.`,
      location: { file: options.rootDir, line: 0 },
      suggestion:
        'Split large interfaces into smaller, focused ones (Interface Segregation Principle).',
    });
  }

  if (indexResult.dimensions.observabilityScore < 60) {
    issues.push({
      type: IssueType.LowTestability,
      dimension: 'observability',
      severity: Severity.Major,
      message: `High rate of external state mutations detected (${indexResult.dimensions.observabilityScore}/100 observability) — hard for AI to reason about state changes.`,
      location: { file: options.rootDir, line: 0 },
      suggestion:
        'Prefer immutable data patterns and return values instead of mutating external state.',
    });
  }

  return {
    summary: {
      sourceFiles: sourceFiles.length,
      testFiles: testFiles.length,
      coverageRatio: Math.round(actualRatio * 100) / 100,
      score: indexResult.score,
      rating: indexResult.rating,
      aiChangeSafetyRating: indexResult.aiChangeSafetyRating,
      dimensions: indexResult.dimensions,
    },
    issues,
    rawData: {
      sourceFiles: sourceFiles.length,
      testFiles: testFiles.length,
      ...aggregated,
      hasTestFramework,
    },
    recommendations: indexResult.recommendations,
  };
}
