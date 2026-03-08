import {
  scanFiles,
  calculateTestabilityIndex,
  Severity,
  IssueType,
  emitProgress,
  getParser,
  Language,
} from '@aiready/core';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
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

  const parser = getParser(filePath);
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
        if (total > 5) {
          result.bloatedInterfaces++;
        }
      }

      if (exp.type === 'interface') {
        result.totalInterfaces++;
        // Heuristic: interfaces with many methods/props are considered bloated
        const total = (exp.methodCount || 0) + (exp.propertyCount || 0);
        if (total > 5) {
          result.bloatedInterfaces++;
        }
      }
    }
  } catch (error) {
    console.warn(`Testability: Failed to parse ${filePath}: ${error}`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Test framework detection
// ---------------------------------------------------------------------------

function detectTestFramework(rootDir: string): boolean {
  // Check common manifest files
  const manifests = [
    {
      file: 'package.json',
      deps: ['jest', 'vitest', 'mocha', 'mocha', 'jasmine', 'ava', 'tap'],
    },
    { file: 'requirements.txt', deps: ['pytest', 'unittest', 'nose'] },
    { file: 'pyproject.toml', deps: ['pytest'] },
    { file: 'pom.xml', deps: ['junit', 'testng'] },
    { file: 'build.gradle', deps: ['junit', 'testng'] },
    { file: 'go.mod', deps: ['testing'] }, // go testing is built-in
  ];

  for (const m of manifests) {
    const p = join(rootDir, m.file);
    if (existsSync(p)) {
      if (m.file === 'go.mod') return true; // built-in
      try {
        const content = readFileSync(p, 'utf-8');
        if (m.deps.some((d) => content.includes(d))) return true;
      } catch {}
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main analyzer
// ---------------------------------------------------------------------------

const TEST_PATTERNS = [
  /\.(test|spec)\.(ts|tsx|js|jsx)$/,
  /_test\.go$/,
  /test_.*\.py$/,
  /.*_test\.py$/,
  /.*Test\.java$/,
  /.*Tests\.cs$/,
  /__tests__\//,
  /\/tests?\//,
  /\/e2e\//,
  /\/fixtures\//,
];

function isTestFile(filePath: string, extra?: string[]): boolean {
  if (TEST_PATTERNS.some((p) => p.test(filePath))) return true;
  if (extra) return extra.some((p) => filePath.includes(p));
  return false;
}

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
    (f) => !isTestFile(f, options.testPatterns)
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

  let processed = 0;
  for (const f of sourceFiles) {
    processed++;
    emitProgress(
      processed,
      sourceFiles.length,
      'testability',
      'analyzing files',
      options.onProgress
    );

    const a = await analyzeFileTestability(f);
    for (const key of Object.keys(aggregated) as Array<keyof FileAnalysis>) {
      aggregated[key] += a[key];
    }
  }

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

  if (indexResult.dimensions.purityScore < 50) {
    issues.push({
      type: IssueType.LowTestability,
      dimension: 'purity',
      severity: Severity.Major,
      message: `Only ${indexResult.dimensions.purityScore}% of functions appear pure — side-effectful code is harder for AI to verify safely.`,
      location: { file: options.rootDir, line: 0 },
      suggestion:
        'Refactor complex side-effectful logic into pure functions where possible.',
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
