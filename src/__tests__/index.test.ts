import { describe, it, expect } from 'vitest';
import * as index from '../index';
import type { AiSignalClarityOptions, AiSignalClarityReport } from '../types';

describe('AiSignalClarity Index Exports', () => {
  it('should export analyzeAiSignalClarity function', () => {
    expect(index.analyzeAiSignalClarity).toBeDefined();
    expect(typeof index.analyzeAiSignalClarity).toBe('function');
  });

  it('should export calculateAiSignalClarityScore function', () => {
    expect(index.calculateAiSignalClarityScore).toBeDefined();
    expect(typeof index.calculateAiSignalClarityScore).toBe('function');
  });

  it('should export performSignalClarityScan function', () => {
    expect(index.performSignalClarityScan).toBeDefined();
    expect(typeof index.performSignalClarityScan).toBe('function');
  });

  it('should export AI_SIGNAL_CLARITY_PROVIDER', () => {
    expect(index.AI_SIGNAL_CLARITY_PROVIDER).toBeDefined();
  });

  it('should export all types', () => {
    // Verify types are exported
    const options: AiSignalClarityOptions = { rootDir: '/test' };
    const report: AiSignalClarityReport = {
      summary: {
        filesAnalyzed: 1,
        totalSignals: 0,
        criticalSignals: 0,
        majorSignals: 0,
        minorSignals: 0,
        topRisk: '',
        rating: 'good',
      },
      results: [],
      aggregateSignals: {
        magicLiterals: 0,
        booleanTraps: 0,
        ambiguousNames: 0,
        undocumentedExports: 0,
        implicitSideEffects: 0,
        deepCallbacks: 0,
        overloadedSymbols: 0,
        largeFiles: 0,
        totalSymbols: 0,
        totalExports: 0,
        totalLines: 0,
      },
      recommendations: [],
    };
    expect(options.rootDir).toBe('/test');
    expect(report.summary.filesAnalyzed).toBe(1);
  });
});
