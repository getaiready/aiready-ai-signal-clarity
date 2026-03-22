/**
 * Scanner for agent-grounding dimensions.
 *
 * Measures 5 dimensions:
 * 1. Structure clarity — how deep are directory trees?
 * 2. Self-documentation — do file names reveal purpose?
 * 3. Entry points — does a fresh README + barrel exports exist?
 * 4. API clarity — are public exports typed?
 * 5. Domain consistency — is the same concept named the same everywhere?
 */

import {
  scanEntries,
  calculateAgentGrounding,
  VAGUE_FILE_NAMES,
  Severity,
  IssueType,
  emitProgress,
  getParser,
} from '@aiready/core';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, basename, relative } from 'path';
import type {
  AgentGroundingOptions,
  AgentGroundingIssue,
  AgentGroundingReport,
} from './types';

// ---------------------------------------------------------------------------
// Per-file analysis
// ---------------------------------------------------------------------------

interface FileAnalysis {
  isBarrel: boolean;
  exportedNames: string[];
  untypedExports: number;
  totalExports: number;
  domainTerms: string[];
}

async function analyzeFile(filePath: string): Promise<FileAnalysis> {
  const result: FileAnalysis = {
    isBarrel: false,
    exportedNames: [],
    untypedExports: 0,
    totalExports: 0,
    domainTerms: [],
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
      if (
        exp.type === 'function' ||
        exp.type === 'class' ||
        exp.type === 'const'
      ) {
        result.totalExports++;
        const name = exp.name;
        if (name && name !== 'default') {
          result.exportedNames.push(name);
          // Domain consistency terms
          result.domainTerms.push(
            ...name
              .replace(/([A-Z])/g, ' $1')
              .toLowerCase()
              .split(/\s+/)
              .filter(Boolean)
          );

          // Check if it's untyped
          if (exp.isTyped === false) {
            result.untypedExports++;
          }
        }
      }

      // Barrel detection heuristic: if it has many exports
      if (parseResult.exports.length > 5) result.isBarrel = true;
    }
  } catch (error) {
    console.warn(`Agent Grounding: Failed to parse ${filePath}: ${error}`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Domain vocabulary consistency check
// ---------------------------------------------------------------------------

function detectInconsistentTerms(allTerms: string[]): {
  inconsistent: number;
  vocabularySize: number;
} {
  const termFreq = new Map<string, number>();
  for (const term of allTerms) {
    if (term.length >= 3) {
      termFreq.set(term, (termFreq.get(term) ?? 0) + 1);
    }
  }
  // Very simplistic: terms that appear exactly once are "orphan concepts" —
  // they may be inconsistently named variants of common terms.
  const orphans = [...termFreq.values()].filter((count) => count === 1).length;
  const common = [...termFreq.values()].filter((count) => count >= 3).length;
  const vocabularySize = termFreq.size;
  // Inconsistency ratio: many orphan terms relative to common terms
  const inconsistent = Math.max(0, orphans - common * 2);
  return { inconsistent, vocabularySize };
}

// ---------------------------------------------------------------------------
// Main analyzer
// ---------------------------------------------------------------------------

export async function analyzeAgentGrounding(
  options: AgentGroundingOptions
): Promise<AgentGroundingReport> {
  const rootDir = options.rootDir;
  const maxRecommendedDepth = options.maxRecommendedDepth ?? 4;
  const readmeStaleDays = options.readmeStaleDays ?? 90;

  // Use core scanEntries which respects .gitignore recursively
  // First scan for metrics that need code analysis (limited to JS/TS)
  const { files, dirs: rawDirs } = await scanEntries({
    ...options,
    include: options.include || ['**/*.{ts,tsx,js,jsx}'],
  });

  // Second scan for ALL files to catch vague names (e.g. data.txt, tmp.log)
  const { files: allFiles } = await scanEntries({
    ...options,
    include: ['**/*'],
  });

  const dirs = rawDirs.map((d: string) => ({
    path: d,
    depth: relative(rootDir, d).split(/[/\\]/).filter(Boolean).length,
  }));

  // Structure clarity
  const deepDirectories = dirs.filter(
    (d: { path: string; depth: number }) => d.depth > maxRecommendedDepth
  ).length;

  // Self-documentation — vague file names
  const additionalVague = new Set(
    (options.additionalVagueNames ?? []).map((n) => n.toLowerCase())
  );
  let vagueFileNames = 0;
  for (const f of allFiles) {
    const base = basename(f, extname(f)).toLowerCase();
    if (VAGUE_FILE_NAMES.has(base) || additionalVague.has(base)) {
      vagueFileNames++;
    }
  }

  // README presence and freshness
  const readmePath = join(rootDir, 'README.md');
  const hasRootReadme = existsSync(readmePath);
  let readmeIsFresh = false;
  if (hasRootReadme) {
    try {
      const stat = statSync(readmePath);
      const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
      readmeIsFresh = ageDays < readmeStaleDays;
    } catch {
      /* ignore stat errors */
    }
  }

  // File analysis
  const allDomainTerms: string[] = [];
  let barrelExports = 0;
  let untypedExports = 0;
  let totalExports = 0;

  let processed = 0;
  for (const f of files) {
    processed++;
    emitProgress(
      processed,
      files.length,
      'agent-grounding',
      'analyzing files',
      options.onProgress
    );

    const analysis = await analyzeFile(f);
    if (analysis.isBarrel) barrelExports++;
    untypedExports += analysis.untypedExports;
    totalExports += analysis.totalExports;
    allDomainTerms.push(...analysis.domainTerms);
  }

  // Domain vocabulary consistency
  const {
    inconsistent: inconsistentDomainTerms,
    vocabularySize: domainVocabularySize,
  } = detectInconsistentTerms(allDomainTerms);

  // Calculate grounding score using core math
  const groundingResult = calculateAgentGrounding({
    deepDirectories,
    totalDirectories: dirs.length,
    vagueFileNames,
    totalFiles: files.length,
    hasRootReadme,
    readmeIsFresh,
    barrelExports,
    untypedExports,
    totalExports: Math.max(1, totalExports),
    inconsistentDomainTerms,
    domainVocabularySize: Math.max(1, domainVocabularySize),
  });

  // Build issues list
  const issues: AgentGroundingIssue[] = [];

  if (groundingResult.dimensions.structureClarityScore < 70) {
    issues.push({
      type: IssueType.AgentNavigationFailure,
      dimension: 'structure-clarity',
      severity: Severity.Major,
      message: `${deepDirectories} directories exceed recommended depth of ${maxRecommendedDepth} — agents struggle to navigate deep trees.`,
      location: { file: rootDir, line: 0 },
      suggestion: `Flatten nested directories to ${maxRecommendedDepth} levels or fewer.`,
    });
  }

  if (groundingResult.dimensions.selfDocumentationScore < 70) {
    issues.push({
      type: IssueType.AgentNavigationFailure,
      dimension: 'self-documentation',
      severity: Severity.Major,
      message: `${vagueFileNames} files use vague names (utils, helpers, misc) — an agent cannot determine their purpose from the name alone.`,
      location: { file: rootDir, line: 0 },
      suggestion:
        'Rename to domain-specific names: e.g., userAuthUtils → tokenValidator.',
    });
  }

  if (!hasRootReadme) {
    issues.push({
      type: IssueType.AgentNavigationFailure,
      dimension: 'entry-point',
      severity: Severity.Critical,
      message:
        'No root README.md found — agents have no orientation document to start from.',
      location: { file: join(rootDir, 'README.md'), line: 0 },
      suggestion:
        'Add a README.md explaining the project structure, entry points, and key conventions.',
    });
  } else if (!readmeIsFresh) {
    issues.push({
      type: IssueType.AgentNavigationFailure,
      dimension: 'entry-point',
      severity: Severity.Minor,
      message: `README.md is stale (>${readmeStaleDays} days without updates) — agents may be misled by outdated context.`,
      location: { file: readmePath, line: 0 },
      suggestion: 'Update README.md to reflect the current codebase structure.',
    });
  }

  if (untypedExports > 0) {
    issues.push({
      type: IssueType.AgentNavigationFailure,
      dimension: 'api-clarity',
      severity:
        groundingResult.dimensions.apiClarityScore < 70
          ? Severity.Major
          : Severity.Minor,
      message: `${untypedExports} of ${totalExports} public exports lack TypeScript type annotations — agents cannot infer the API contract.`,
      location: { file: rootDir, line: 0 },
      suggestion:
        'Add explicit return type and parameter annotations to all exported functions.',
    });
  }

  if (groundingResult.dimensions.domainConsistencyScore < 70) {
    issues.push({
      type: IssueType.AgentNavigationFailure,
      dimension: 'domain-consistency',
      severity: Severity.Major,
      message: `${inconsistentDomainTerms} domain terms appear to be used inconsistently — agents get confused when one concept has multiple names.`,
      location: { file: rootDir, line: 0 },
      suggestion:
        'Establish a domain glossary and enforce one term per concept across the codebase.',
    });
  }

  return {
    summary: {
      filesAnalyzed: files.length,
      directoriesAnalyzed: dirs.length,
      score: groundingResult.score,
      rating: groundingResult.rating,
      dimensions: groundingResult.dimensions,
    },
    issues,
    rawData: {
      deepDirectories,
      totalDirectories: dirs.length,
      vagueFileNames,
      totalFiles: files.length,
      hasRootReadme,
      readmeIsFresh,
      barrelExports,
      untypedExports,
      totalExports,
      inconsistentDomainTerms,
      domainVocabularySize,
    },
    recommendations: groundingResult.recommendations,
  };
}
