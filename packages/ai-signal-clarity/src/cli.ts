#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeAiSignalClarity } from './analyzer';
import { calculateAiSignalClarityScore } from './scoring';
import type { AiSignalClarityOptions } from './types';
import chalk from 'chalk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import {
  loadConfig,
  mergeConfigWithDefaults,
  resolveOutputPath,
  displayStandardConsoleReport,
} from '@aiready/core';

const program = new Command();

program
  .name('aiready-ai-signal-clarity')
  .description(
    'Detect code patterns that cause AI models to hallucinate incorrect implementations'
  )
  .version('0.1.0')
  .addHelpText(
    'after',
    `
SIGNAL TYPES DETECTED:
  Magic Literals      Unnamed numbers/strings confuse AI intent inference
  Boolean Traps       Positional boolean args cause AI to invert intent
  Ambiguous Names     Single-letter, x1/x2, tmp/data names mislead AI
  Undocumented Exports  Public API without JSDoc → AI fabricates behavior
  Implicit Side Effects  Void functions that mutate state — AI misses contracts
  Deep Callbacks      Nesting >3 levels — AI loses control flow
  Overloaded Symbols  Same name, different signatures → AI picks wrong one

EXAMPLES:
  aiready-ai-signal-clarity .                        # Full scan
  aiready-ai-signal-clarity src/ --output json       # JSON report
  aiready-ai-signal-clarity . --min-severity major   # Only major+
`
  )
  .argument('<directory>', 'Directory to analyze')
  .option('--no-magic-literals', 'Skip magic literal detection')
  .option('--no-boolean-traps', 'Skip boolean trap detection')
  .option('--no-ambiguous-names', 'Skip ambiguous name detection')
  .option('--no-undocumented-exports', 'Skip undocumented export detection')
  .option('--no-implicit-side-effects', 'Skip implicit side-effect detection')
  .option('--no-deep-callbacks', 'Skip deep callback detection')
  .option(
    '--min-severity <level>',
    'Minimum severity: info|minor|major|critical',
    'info'
  )
  .option('--include <patterns>', 'File patterns to include (comma-separated)')
  .option('--exclude <patterns>', 'File patterns to exclude (comma-separated)')
  .option(
    '-o, --output <format>',
    'Output format: console|json|markdown',
    'console'
  )
  .option('--output-file <path>', 'Output file path (for json/markdown)')
  .action(async (directory, options) => {
    console.log(chalk.blue('🧠 Analyzing AI signal clarity...\n'));
    const startTime = Date.now();

    const config = await loadConfig(directory);
    const mergedConfig = mergeConfigWithDefaults(config, {
      minSeverity: 'info',
      checkMagicLiterals: true,
      checkBooleanTraps: true,
      checkAmbiguousNames: true,
      checkUndocumentedExports: true,
      checkImplicitSideEffects: true,
      checkDeepCallbacks: true,
    });

    const finalOptions: AiSignalClarityOptions = {
      rootDir: directory,
      minSeverity: options.minSeverity || mergedConfig.minSeverity,
      checkMagicLiterals: options.magicLiterals !== false,
      checkBooleanTraps: options.booleanTraps !== false,
      checkAmbiguousNames: options.ambiguousNames !== false,
      checkUndocumentedExports: options.undocumentedExports !== false,
      checkImplicitSideEffects: options.implicitSideEffects !== false,
      checkDeepCallbacks: options.deepCallbacks !== false,
      include: options.include?.split(','),
      exclude: options.exclude?.split(','),
    };

    const report = await analyzeAiSignalClarity(finalOptions);
    const scoringOutput = calculateAiSignalClarityScore(report);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (options.output === 'json') {
      const payload = { report, score: scoringOutput };
      const outputPath = resolveOutputPath(
        options.outputFile,
        `ai-signal-clarity-report-${new Date().toISOString().split('T')[0]}.json`,
        directory
      );
      const dir = dirname(outputPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(outputPath, JSON.stringify(payload, null, 2));
      console.log(chalk.green(`✓ Report saved to ${outputPath}`));
    } else {
      displayStandardConsoleReport({
        title: '🧠 AI Signal Clarity Analysis',
        score: scoringOutput.score,
        rating: report.summary.rating,
        dimensions: [
          {
            name: 'Magic Literals',
            value: Math.min(100, report.aggregateSignals.magicLiterals * 10),
          },
          {
            name: 'Boolean Traps',
            value: Math.min(100, report.aggregateSignals.booleanTraps * 10),
          },
          {
            name: 'Ambiguous Names',
            value: Math.min(100, report.aggregateSignals.ambiguousNames * 10),
          },
          {
            name: 'Undoc. Exports',
            value: Math.min(
              100,
              report.aggregateSignals.undocumentedExports * 10
            ),
          },
          {
            name: 'Side Effects',
            value: Math.min(
              100,
              report.aggregateSignals.implicitSideEffects * 10
            ),
          },
        ],
        stats: [
          { label: 'Files Analyzed', value: report.summary.filesAnalyzed },
          { label: 'Total Signals', value: report.summary.totalSignals },
          { label: 'Critical', value: report.summary.criticalSignals },
        ],
        issues: report.results
          .flatMap((r: any) =>
            r.issues.map((i: any) => ({
              ...i,
              message: `[${r.fileName.split('/').pop()}] ${i.message}`,
            }))
          )
          .slice(0, 10),
        recommendations: report.recommendations,
        elapsedTime: elapsed,
        noIssuesMessage:
          '✨ No AI signal clarity signals found! Your codebase is AI-safe.',
      });
    }
  });

program.parse();
