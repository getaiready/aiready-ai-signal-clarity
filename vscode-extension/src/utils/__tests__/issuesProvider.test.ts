/**
 * Unit tests for issuesProvider — no VS Code runtime needed.
 *
 * These tests verify:
 * 1. Severity and FRIENDLY_TOOL_NAMES are self-contained (no external imports)
 * 2. Issue filtering logic works correctly
 * 3. The provider's pure methods behave as expected
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock vscode before importing the provider
// ---------------------------------------------------------------------------
vi.mock('vscode', () => {
  const EventEmitter = class {
    event = vi.fn();
    fire = vi.fn();
    dispose = vi.fn();
  };
  const ThemeIcon = class {
    constructor(public id: string) {}
  };
  const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
  const TreeItem = class {
    label: string;
    collapsibleState: number;
    iconPath: any;
    description: any;
    tooltip: any;
    contextValue: any;
    command: any;
    constructor(
      label: string,
      collapsibleState = TreeItemCollapsibleState.None
    ) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  };
  const Uri = {
    file: (path: string) => ({
      scheme: 'file',
      fsPath: path,
      toString: () => `file://${path}`,
    }),
  };
  const Range = class {
    constructor(
      public startLine: number,
      public startChar: number,
      public endLine: number,
      public endChar: number
    ) {}
  };
  return {
    EventEmitter,
    ThemeIcon,
    TreeItemCollapsibleState,
    TreeItem,
    Uri,
    Range,
  };
});

import {
  Severity,
  FRIENDLY_TOOL_NAMES,
  AIReadyIssuesProvider,
  type Issue,
} from '../../providers/issuesProvider';

// ---------------------------------------------------------------------------
// Severity enum
// ---------------------------------------------------------------------------
describe('Severity enum', () => {
  it('has the expected string values', () => {
    expect(Severity.Critical).toBe('critical');
    expect(Severity.Major).toBe('major');
    expect(Severity.Minor).toBe('minor');
    expect(Severity.Info).toBe('info');
  });

  it('covers all four severity levels', () => {
    const values = Object.values(Severity);
    expect(values).toHaveLength(4);
    expect(values).toContain('critical');
    expect(values).toContain('major');
    expect(values).toContain('minor');
    expect(values).toContain('info');
  });
});

// ---------------------------------------------------------------------------
// FRIENDLY_TOOL_NAMES map
// ---------------------------------------------------------------------------
describe('FRIENDLY_TOOL_NAMES', () => {
  it('is a plain object (not an external import)', () => {
    expect(typeof FRIENDLY_TOOL_NAMES).toBe('object');
    expect(FRIENDLY_TOOL_NAMES).not.toBeNull();
  });

  it('contains friendly labels for all core tools', () => {
    const coreTools = [
      'pattern-detect',
      'context-analyzer',
      'naming-consistency',
      'ai-signal-clarity',
      'agent-grounding',
      'testability-index',
      'doc-drift',
      'dependency-health',
    ];
    for (const tool of coreTools) {
      expect(
        FRIENDLY_TOOL_NAMES[tool],
        `Missing friendly name for tool: ${tool}`
      ).toBeTruthy();
    }
  });

  it('values are human-readable strings (not kebab-case IDs)', () => {
    for (const [, label] of Object.entries(FRIENDLY_TOOL_NAMES)) {
      // Should contain at least one uppercase letter or space (i.e. not a raw ID)
      expect(/[A-Z ]/.test(label), `Label "${label}" looks like a raw ID`).toBe(
        true
      );
    }
  });
});

// ---------------------------------------------------------------------------
// AIReadyIssuesProvider — filtering logic
// ---------------------------------------------------------------------------
describe('AIReadyIssuesProvider', () => {
  let provider: AIReadyIssuesProvider;

  const sampleIssues: Issue[] = [
    {
      message: 'Duplicate pattern in auth module',
      severity: Severity.Critical,
      tool: 'pattern-detect',
      location: { file: 'src/auth.ts', line: 10 },
    },
    {
      message: 'Context fragmentation detected',
      severity: Severity.Major,
      tool: 'context-analyzer',
      location: { file: 'src/api.ts' },
    },
    {
      message: 'Naming inconsistency found',
      severity: Severity.Minor,
      tool: 'naming-consistency',
      location: { file: 'src/utils.ts', line: 5 },
    },
    {
      message: 'Low test coverage',
      severity: Severity.Info,
      tool: 'testability-index',
      location: { file: 'src/db.ts' },
    },
  ];

  beforeEach(() => {
    provider = new AIReadyIssuesProvider();
    provider.refresh(sampleIssues);
  });

  it('constructs without throwing (no external deps at runtime)', () => {
    expect(() => new AIReadyIssuesProvider()).not.toThrow();
  });

  it('getTreeItem returns the element unchanged', () => {
    const item = { label: 'test', contextValue: 'issue' } as any;
    expect(provider.getTreeItem(item)).toBe(item);
  });

  it('returns run-scan prompt when no issues loaded', () => {
    const empty = new AIReadyIssuesProvider();
    const children = empty.getChildren() as any[];
    expect(children.length).toBeGreaterThan(0);
    expect(children[0].label).toContain('Run Scan');
  });

  it('severity filter — critical only', () => {
    provider.setSeverityFilter('critical');
    const children = provider.getChildren() as any[];
    // All leaf items should be critical
    const issueItems = children.filter((c: any) => c.contextValue === 'issue');
    for (const item of issueItems) {
      expect(item.issue?.severity).toBe(Severity.Critical);
    }
  });

  it('severity filter — all shows all issues', () => {
    provider.setSeverityFilter('all');
    const children = provider.getChildren() as any[];
    // Should have more items than just critical
    expect(children.length).toBeGreaterThan(1);
  });

  it('groupBy — switching group does not throw', () => {
    expect(() => provider.setGroupBy('severity')).not.toThrow();
    expect(() => provider.setGroupBy('tool')).not.toThrow();
    expect(() => provider.setGroupBy('file')).not.toThrow();
    expect(() => provider.setGroupBy('none')).not.toThrow();
  });

  it('search filter — filters by message text', () => {
    provider.setGroupBy('none');
    provider.setSearchQuery('auth');
    const children = provider.getChildren() as any[];
    const issueItems = children.filter((c: any) => c.contextValue === 'issue');
    expect(issueItems.length).toBe(1);
    // description is set to the file path (locationStr)
    expect(issueItems[0].description).toContain('auth');
  });

  it('search filter — filters by file path', () => {
    provider.setGroupBy('none');
    provider.setSearchQuery('api.ts');
    const children = provider.getChildren() as any[];
    const issueItems = children.filter((c: any) => c.contextValue === 'issue');
    expect(issueItems.length).toBe(1);
    expect(issueItems[0].description).toContain('api.ts');
  });

  it('search filter — empty query shows all', () => {
    provider.setGroupBy('none');
    provider.setSearchQuery('');
    const children = provider.getChildren() as any[];
    const issueItems = children.filter((c: any) => c.contextValue === 'issue');
    expect(issueItems.length).toBe(sampleIssues.length);
  });
});
