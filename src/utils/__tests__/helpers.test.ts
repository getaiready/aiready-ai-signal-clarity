import { describe, it, expect } from 'vitest';
import {
  getReportTimestamp,
  truncateArray,
  generateMarkdownReport,
} from '../helpers';

describe('CLI Helpers', () => {
  it('should generate a valid timestamp', () => {
    const ts = getReportTimestamp();
    expect(ts).toMatch(/^\d{8}-\d{6}$/);
  });

  it('should truncate arrays correctly', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(truncateArray(arr, 3)).toContain('+2 more');
    expect(truncateArray(arr, 10)).toBe('1, 2, 3, 4, 5');
  });

  it('should generate markdown report', () => {
    const report = {
      summary: {
        filesAnalyzed: 10,
        totalIssues: 5,
        namingIssues: 2,
        patternIssues: 3,
      },
      recommendations: ['Fix naming'],
    };
    const md = generateMarkdownReport(report, '1.5');
    expect(md).toContain('# Consistency Analysis Report');
    expect(md).toContain('Files Analyzed: 10');
    expect(md).toContain('Fix naming');
  });
});
