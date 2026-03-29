import * as vscode from 'vscode';

// Smart defaults matching CLI behavior (all scoring spokes)
export const SMART_DEFAULTS = {
  threshold: 70,
  tools: [
    'patterns',
    'context',
    'consistency',
    'ai-signal-clarity',
    'agent-grounding',
    'testability',
    'doc-drift',
    'deps-health',
    'contract-enforcement',
  ] as const,
  failOn: 'critical' as const,
  autoScan: false,
  showStatusBar: true,
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    '.git/**',
    '**/*.min.js',
    '**/build/**',
  ],
};

export interface AIReadyConfig {
  threshold: number;
  tools: string[];
  failOn: string;
  autoScan: boolean;
  showStatusBar: boolean;
  excludePatterns: string[];
  overrides?: {
    threshold?: boolean;
    tools?: boolean;
    failOn?: boolean;
  };
}

/**
 * Get merged configuration with smart defaults (matching CLI behavior)
 */
export function getMergedConfig(): AIReadyConfig {
  const config = vscode.workspace.getConfiguration('aiready');

  const thresholdEntry = config.inspect<number>('threshold');
  const toolsEntry = config.inspect<string[]>('tools');
  const failOnEntry = config.inspect<string>('failOn');

  return {
    threshold: config.get<number>('threshold', SMART_DEFAULTS.threshold),
    tools: config.get<string[]>('tools', [...SMART_DEFAULTS.tools]),
    failOn: config.get<string>('failOn', SMART_DEFAULTS.failOn),
    autoScan: config.get<boolean>('autoScan', SMART_DEFAULTS.autoScan),
    showStatusBar: config.get<boolean>(
      'showStatusBar',
      SMART_DEFAULTS.showStatusBar
    ),
    excludePatterns: config.get<string[]>('excludePatterns', [
      ...SMART_DEFAULTS.excludePatterns,
    ]),
    overrides: {
      threshold:
        thresholdEntry?.globalValue !== undefined ||
        thresholdEntry?.workspaceValue !== undefined,
      tools:
        toolsEntry?.globalValue !== undefined ||
        toolsEntry?.workspaceValue !== undefined,
      failOn:
        failOnEntry?.globalValue !== undefined ||
        failOnEntry?.workspaceValue !== undefined,
    },
  };
}
