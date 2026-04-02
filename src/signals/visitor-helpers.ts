import type { TSESTree } from '@typescript-eslint/types';

/**
 * Detect if a file is likely a Lambda handler or serverless function.
 * Common naming patterns are used to identify entry points that often have
 * specific parameter structures (like event/context).
 *
 * @param filePath - Path to the file being analyzed
 * @returns true if the file is likely a Lambda handler
 */
export function isLambdaHandlerFile(filePath: string): boolean {
  const normalizedPath = filePath.toLowerCase();
  return (
    normalizedPath.includes('handler') ||
    normalizedPath.includes('lambda') ||
    normalizedPath.includes('/handlers/') ||
    normalizedPath.includes('/functions/') ||
    normalizedPath.endsWith('.handler.ts') ||
    normalizedPath.endsWith('.handler.js')
  );
}

/**
 * Detect if a file is likely a CLI command file using Commander.js.
 * These files legitimately use many string literals for option definitions
 * and descriptions, which shouldn't be flagged as magic strings.
 *
 * @param filePath - Path to the file
 * @param code - Raw source code content
 * @returns true if the file is likely a CLI command file
 */
export function isCliCommandFile(filePath: string, code: string): boolean {
  const normalizedPath = filePath.toLowerCase();
  const normalizedCode = code.toLowerCase();

  // Check file path patterns
  if (
    normalizedPath.includes('/commands/') ||
    normalizedPath.includes('/cli/') ||
    normalizedPath.endsWith('.command.ts') ||
    normalizedPath.endsWith('.command.js')
  ) {
    return true;
  }

  // Check for Commander.js patterns in code
  if (
    normalizedCode.includes('.command(') &&
    normalizedCode.includes('.description(') &&
    (normalizedCode.includes('.option(') || normalizedCode.includes('.action('))
  ) {
    return true;
  }

  return false;
}

/**
 * Detect if a file is likely a visualization or chart component (D3, Recharts, etc.).
 * These files legitimately use many numeric parameters for positioning, sizing, and
 * geometry calculations, which shouldn't be flagged as magic numbers.
 *
 * @param filePath - Path to the file
 * @param code - Raw source code content
 * @returns true if the file is likely a visualization component
 */
export function isVisualizationFile(filePath: string, code: string): boolean {
  const normalizedPath = filePath.toLowerCase();
  const normalizedCode = code.toLowerCase();

  if (
    normalizedPath.includes('graph') ||
    normalizedPath.includes('chart') ||
    normalizedPath.includes('visualiz') ||
    normalizedPath.includes('force-directed') ||
    normalizedPath.includes('simulation')
  ) {
    return true;
  }

  if (
    normalizedCode.includes('d3.force') ||
    normalizedCode.includes('d3.zoom') ||
    normalizedCode.includes('d3.drag') ||
    normalizedCode.includes('forcesimulation') ||
    normalizedCode.includes('forcelink') ||
    normalizedCode.includes('forcemanybody') ||
    normalizedCode.includes('forcecenter') ||
    normalizedCode.includes('forcecollide')
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a boolean value is a common Lambda/Serverless parameter.
 * These are standard and well-understood by AIs, so they don't count as "traps".
 *
 * @param node - The AST node being checked
 * @param parent - The parent node in the AST
 * @returns true if the parameter is a standard Lambda boolean
 */
export function isLambdaBooleanParam(
  node: TSESTree.Node,
  parent?: TSESTree.Node
): boolean {
  if (!parent) return false;

  const lambdaBooleans = new Set([
    'isBase64Encoded',
    'isBase64',
    'multiValueHeaders',
    'queryStringParameters',
    'pathParameters',
    'stageVariables',
  ]);

  if (parent.type === 'Property' && parent.key) {
    const key = parent.key as TSESTree.Identifier | TSESTree.Literal;
    const keyName =
      (key as TSESTree.Identifier).name || (key as TSESTree.Literal).value;
    if (typeof keyName === 'string' && lambdaBooleans.has(keyName)) {
      return true;
    }
  }

  return false;
}
