import { Severity, IssueType, SignalContext, SignalResult } from './types';
import { isAmbiguousName } from '../helpers';
import type { ParseResult } from '@aiready/core';
import {
  LINE_THRESHOLD_CRITICAL,
  LINE_THRESHOLD_MAJOR,
  CATEGORY_LARGE_FILE,
  CATEGORY_UNDOCUMENTED_EXPORT,
  CATEGORY_IMPLICIT_SIDE_EFFECT,
  CATEGORY_AMBIGUOUS_NAME,
  CATEGORY_OVERLOADED_SYMBOL,
  IGNORE_EXPORTS,
  MSG_EXTREME_FILE,
  MSG_LARGE_FILE,
  SUGGESTION_SPLIT_FILE,
  SUGGESTION_REFACTOR_FILE,
} from './constants';

/**
 * Checks for signals in exported symbols and general file properties.
 */
export function detectExportSignals(
  ctx: SignalContext,
  parseResult: ParseResult
): SignalResult {
  const issues: any[] = [];
  const signals = {
    largeFiles: 0,
    undocumentedExports: 0,
    implicitSideEffects: 0,
    ambiguousNames: 0,
    overloadedSymbols: 0,
  };

  const { filePath, lineCount, options } = ctx;

  // 0. Check File Size (Large Files)
  if (options.checkLargeFiles !== false) {
    if (lineCount > LINE_THRESHOLD_CRITICAL) {
      signals.largeFiles++;
      issues.push({
        type: IssueType.AiSignalClarity,
        category: CATEGORY_LARGE_FILE,
        severity: Severity.Critical,
        message: MSG_EXTREME_FILE(lineCount),
        location: { file: filePath, line: 1 },
        suggestion: SUGGESTION_SPLIT_FILE,
      });
    } else if (lineCount > LINE_THRESHOLD_MAJOR) {
      signals.largeFiles++;
      issues.push({
        type: IssueType.AiSignalClarity,
        category: CATEGORY_LARGE_FILE,
        severity: Severity.Major,
        message: MSG_LARGE_FILE(lineCount),
        location: { file: filePath, line: 1 },
        suggestion: SUGGESTION_REFACTOR_FILE,
      });
    }
  }

  // Symbol tracking for overloading detection
  const symbolCounts = new Map<string, number>();

  for (const exp of parseResult.exports) {
    // Overload tracking
    symbolCounts.set(exp.name, (symbolCounts.get(exp.name) || 0) + 1);

    // Undocumented Exports
    if (options.checkUndocumentedExports !== false) {
      const isTypeOrInterface = exp.type === 'type' || exp.type === 'interface';

      if (
        !isTypeOrInterface &&
        (!exp.documentation || !exp.documentation.content)
      ) {
        signals.undocumentedExports++;
        issues.push({
          type: IssueType.AiSignalClarity,
          category: CATEGORY_UNDOCUMENTED_EXPORT,
          severity: Severity.Minor,
          message: `Public export "${exp.name}" has no documentation — AI fabricates behavior from the name alone.`,
          location: {
            file: filePath,
            line: exp.loc?.start.line || 1,
            column: exp.loc?.start.column,
          },
          suggestion:
            'Add a docstring or comment describing parameters, return value, and side effects.',
        });
      }
    }

    // Implicit Side Effects
    if (options.checkImplicitSideEffects !== false) {
      if (exp.hasSideEffects && !exp.isPure && exp.type === 'function') {
        const lowerName = exp.name.toLowerCase();
        const looksPure =
          !/(set|update|save|delete|create|write|send|post|sync)/.test(
            lowerName
          );

        // Skip console output functions - printing IS their expected behavior
        const isConsoleOutputFunction =
          lowerName.startsWith('render') ||
          lowerName.startsWith('print') ||
          lowerName.startsWith('log') ||
          lowerName.startsWith('display') ||
          lowerName.startsWith('show') ||
          lowerName.startsWith('emit') ||
          lowerName.startsWith('output') ||
          lowerName.endsWith('header') ||
          lowerName.endsWith('footer') ||
          lowerName.endsWith('summary') ||
          lowerName.endsWith('block') ||
          lowerName.endsWith('section');

        if (looksPure && !isConsoleOutputFunction) {
          signals.implicitSideEffects++;
          issues.push({
            type: IssueType.AiSignalClarity,
            category: CATEGORY_IMPLICIT_SIDE_EFFECT,
            severity: Severity.Major,
            message: `Function "${exp.name}" mutates external state but name doesn't reflect it — AI misses this contract.`,
            location: {
              file: filePath,
              line: exp.loc?.start.line || 1,
            },
            suggestion:
              'Make side-effects explicit in function name (e.g., updateX) or return a result.',
          });
        }
      }
    }

    // Ambiguous Names for Exports
    if (
      options.checkAmbiguousNames !== false &&
      !IGNORE_EXPORTS.includes(exp.name) &&
      isAmbiguousName(exp.name)
    ) {
      signals.ambiguousNames++;
      issues.push({
        type: IssueType.AmbiguousApi,
        category: CATEGORY_AMBIGUOUS_NAME,
        severity: Severity.Info,
        message: `Ambiguous public export "${exp.name}" — AI cannot infer intent and will guess incorrectly.`,
        location: {
          file: filePath,
          line: exp.loc?.start.line || 1,
        },
        suggestion: 'Use a domain-descriptive name instead.',
      });
    }
  }

  // Report Overloads
  if (options.checkOverloadedSymbols !== false) {
    for (const [name, count] of symbolCounts.entries()) {
      if (count > 1 && !IGNORE_EXPORTS.includes(name)) {
        signals.overloadedSymbols++;
        issues.push({
          type: IssueType.AiSignalClarity,
          category: CATEGORY_OVERLOADED_SYMBOL,
          severity: Severity.Critical,
          message: `Symbol "${name}" has ${count} overloaded signatures — AI often picks the wrong one or gets confused by conflicting contracts.`,
          location: {
            file: filePath,
            line: 1,
          },
          suggestion: `Rename overloads to unique, descriptive names if possible.`,
        });
      }
    }
  }

  return { issues, signals };
}
