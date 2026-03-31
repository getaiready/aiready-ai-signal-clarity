import { Severity, IssueType, SignalContext, SignalResult } from './types';
import {
  isAmbiguousName,
  isMagicNumber,
  isMagicString,
  isRedundantTypeConstant,
} from '../helpers';
import {
  CATEGORY_MAGIC_LITERAL,
  CATEGORY_REDUNDANT_TYPE_CONSTANT,
  CATEGORY_BOOLEAN_TRAP,
  CATEGORY_AMBIGUOUS_NAME,
  CATEGORY_DEEP_CALLBACK,
  CALLBACK_DEPTH_THRESHOLD,
} from './constants';
import type { TSESTree } from '@typescript-eslint/types';
import type * as Parser from 'web-tree-sitter';

/**
 * Detect if a file is likely a Lambda handler or serverless function.
 * Common naming patterns are used to identify entry points that often have
 * specific parameter structures (like event/context).
 *
 * @param filePath - Path to the file being analyzed
 * @returns true if the file is likely a Lambda handler
 */
function isLambdaHandlerFile(filePath: string): boolean {
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
function isCliCommandFile(filePath: string, code: string): boolean {
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
function isVisualizationFile(filePath: string, code: string): boolean {
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
function isLambdaBooleanParam(
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

/**
 * Traverses the AST and detects structural signals like magic literals,
 * boolean traps, and ambiguous naming that may reduce AI signal clarity.
 *
 * This is a core component of the @aiready/ai-signal-clarity tool.
 *
 * @param ctx - Context for the current signal analysis (file, code, options)
 * @param ast - The parsed AST (either ESTree for TS/JS or Tree-sitter for others)
 * @returns Object containing detected issues and signal counts
 */
export function detectStructuralSignals(
  ctx: SignalContext,
  ast: TSESTree.Node | { rootNode: Parser.Node }
): SignalResult {
  const issues: any[] = [];
  const signals = {
    magicLiterals: 0,
    booleanTraps: 0,
    ambiguousNames: 0,
    deepCallbacks: 0,
  };

  const { filePath, options, domainVocabulary } = ctx;

  let callbackDepth = 0;
  let maxCallbackDepth = 0;

  const isConfigFile =
    filePath.endsWith('.config.ts') ||
    filePath.endsWith('.config.js') ||
    filePath.endsWith('.config.mts') ||
    filePath.endsWith('.config.mjs') ||
    filePath.includes('sst.config.ts') ||
    filePath.endsWith('playwright.config.ts');

  const isVisualization = isVisualizationFile(filePath, ctx.code);
  const isCliCommand = isCliCommandFile(filePath, ctx.code);

  /**
   * Helper to check magic literals for Tree-sitter nodes.
   */
  const checkTreeSitterLiterals = (tsNode: Parser.Node) => {
    if (tsNode.type === 'number') {
      const val = parseFloat(tsNode.text);
      if (!isNaN(val) && isMagicNumber(val)) {
        signals.magicLiterals++;
        issues.push({
          type: IssueType.MagicLiteral,
          category: CATEGORY_MAGIC_LITERAL,
          severity: Severity.Minor,
          message: `Magic number ${tsNode.text} — AI will invent wrong semantics. Extract to a named constant.`,
          location: {
            file: filePath,
            line: tsNode.startPosition.row + 1,
            column: tsNode.startPosition.column,
          },
          suggestion: `const MEANINGFUL_NAME = ${tsNode.text};`,
        });
      }
    } else if (tsNode.type === 'string' || tsNode.type === 'string_literal') {
      const val = tsNode.text.replace(/['"]/g, '');
      const isKey =
        tsNode.parent?.type?.includes('pair') ||
        tsNode.parent?.type === 'assignment_expression';
      const isImport =
        tsNode.parent?.type?.toLowerCase().includes('import') ||
        tsNode.parent?.type?.toLowerCase().includes('require') ||
        tsNode.parent?.type?.toLowerCase().includes('use');
      const parentName = tsNode.parent?.childForFieldName('name')?.text || '';
      const isNamedConstant = /^[A-Z0-9_]{2,}$/.test(parentName);

      if (
        !isKey &&
        !isImport &&
        !isNamedConstant &&
        isRedundantTypeConstant(parentName, val)
      ) {
        issues.push({
          type: IssueType.AiSignalClarity,
          category: CATEGORY_REDUNDANT_TYPE_CONSTANT,
          severity: Severity.Minor,
          message: `Redundant type constant — in modern AI-native code, use literals or centralized union types for transparency.`,
          location: { file: filePath, line: tsNode.startPosition.row + 1 },
          suggestion: `Use '${val}' directly in your schema.`,
        });
      } else if (
        !isKey &&
        !isImport &&
        !isNamedConstant &&
        isMagicString(val)
      ) {
        const isDomain =
          domainVocabulary && domainVocabulary.has(val.toLowerCase());
        if (!isDomain) {
          signals.magicLiterals++;
          issues.push({
            type: IssueType.MagicLiteral,
            category: CATEGORY_MAGIC_LITERAL,
            severity: Severity.Info,
            message: `Magic string "${val}" — intent is ambiguous to AI. Consider a named constant.`,
            location: { file: filePath, line: tsNode.startPosition.row + 1 },
          });
        }
      }
    }
  };

  /**
   * Helper to check for boolean traps.
   */
  const checkBooleanTraps = (node: any, parent: any, isTreeSitter: boolean) => {
    if (options.checkBooleanTraps === false) return;
    const isLambdaContext = isLambdaHandlerFile(filePath);

    if (isTreeSitter) {
      if (node.type === 'argument_list') {
        const hasBool = node.namedChildren?.some(
          (c: any) =>
            c.type === 'true' ||
            c.type === 'false' ||
            (c.type === 'boolean' && (c.text === 'true' || c.text === 'false'))
        );
        if (hasBool && !isLambdaContext) {
          signals.booleanTraps++;
          issues.push({
            type: IssueType.BooleanTrap,
            category: CATEGORY_BOOLEAN_TRAP,
            severity: Severity.Major,
            message: `Boolean trap: positional boolean argument at call site. AI inverts intent ~30% of the time.`,
            location: {
              file: filePath,
              line: (node.startPosition?.row || 0) + 1,
            },
            suggestion:
              'Replace boolean arg with a named options object or separate functions.',
          });
        }
      }
    } else {
      const esNode = node as TSESTree.Node;
      if (esNode.type === 'CallExpression') {
        const hasBool = esNode.arguments.some(
          (arg: any) => arg.type === 'Literal' && typeof arg.value === 'boolean'
        );
        if (hasBool) {
          const isLambdaBool = esNode.arguments.some((arg: any) =>
            isLambdaBooleanParam(arg, parent)
          );
          const isUseStateCall =
            esNode.callee?.type === 'Identifier' &&
            esNode.callee?.name === 'useState';
          if (!isLambdaContext && !isLambdaBool && !isUseStateCall) {
            signals.booleanTraps++;
            issues.push({
              type: IssueType.BooleanTrap,
              category: CATEGORY_BOOLEAN_TRAP,
              severity: Severity.Major,
              message: `Boolean trap: positional boolean argument at call site. AI inverts intent ~30% of the time.`,
              location: { file: filePath, line: esNode.loc?.start.line || 1 },
              suggestion:
                'Replace boolean arg with a named options object or separate functions.',
            });
          }
        }
      }
    }
  };

  /**
   * Main visitor function for AST traversal.
   */
  const visitNode = (
    node: TSESTree.Node | Parser.Node,
    parent?: TSESTree.Node | Parser.Node,
    keyInParent?: string
  ) => {
    if (!node) return;

    const isTreeSitter = 'namedChildren' in node;

    // --- Magic Literals ---
    if (
      !isConfigFile &&
      !isVisualization &&
      !isCliCommand &&
      options.checkMagicLiterals !== false
    ) {
      if (isTreeSitter) {
        checkTreeSitterLiterals(node as Parser.Node);
      } else {
        const esNode = node as TSESTree.Node;
        const esParent = parent as TSESTree.Node | undefined;

        if (esNode.type === 'Literal') {
          // Complex heuristic to identify named constants in VariableDeclarators
          let isNamedConstant = false;
          let depth = 0;
          let p: any = esParent;
          while (p && depth < 10) {
            if (
              p.type === 'VariableDeclarator' &&
              p.id.type === 'Identifier' &&
              /^[A-Z0-9_]{2,}$/.test(p.id.name)
            ) {
              isNamedConstant = true;
              break;
            }
            if (
              [
                'ArrayExpression',
                'NewExpression',
                'Property',
                'ObjectExpression',
                'TSAsExpression',
                'TSTypeAssertion',
              ].includes(p.type)
            ) {
              p = p.parent;
              depth++;
            } else break;
          }

          const isObjectKey =
            esParent?.type === 'Property' && keyInParent === 'key';
          const isJSXAttribute = esParent?.type === 'JSXAttribute';
          const isImportSource =
            (esParent?.type === 'ImportDeclaration' ||
              esParent?.type === 'ExportNamedDeclaration' ||
              esParent?.type === 'ExportAllDeclaration') &&
            keyInParent === 'source';
          const isRequireArg =
            esParent?.type === 'CallExpression' &&
            esParent.callee?.type === 'Identifier' &&
            esParent.callee?.name === 'require';

          let isStyleValue = false;
          if (esParent?.type === 'Property' && keyInParent === 'value') {
            let p: any = esParent.parent;
            while (p && p.type === 'ObjectExpression') {
              const grandParent = p.parent;
              if (
                grandParent?.type === 'JSXExpressionContainer' &&
                grandParent.parent?.type === 'JSXAttribute' &&
                grandParent.parent.name?.name === 'style'
              ) {
                isStyleValue = true;
                break;
              }
              p =
                grandParent?.type === 'Property'
                  ? grandParent.parent
                  : undefined;
            }
          }

          const esLiteral = esNode as TSESTree.Literal;
          if (
            typeof esLiteral.value === 'string' &&
            isRedundantTypeConstant(
              (esParent as any).id?.name || '',
              esLiteral.value
            )
          ) {
            issues.push({
              type: IssueType.AiSignalClarity,
              category: CATEGORY_REDUNDANT_TYPE_CONSTANT,
              severity: Severity.Minor,
              message: `Redundant type constant "${(esParent as any).id?.name}" = '${esLiteral.value}' — in modern AI-native code, use literals or centralized union types for transparency.`,
              location: {
                file: filePath,
                line: esLiteral.loc?.start.line || 1,
              },
              suggestion: `Use '${esLiteral.value}' directly in your schema.`,
            });
          } else if (
            !(
              isNamedConstant ||
              isObjectKey ||
              isJSXAttribute ||
              isImportSource ||
              isRequireArg ||
              isStyleValue ||
              (isConfigFile && typeof esLiteral.value === 'string')
            )
          ) {
            if (
              typeof esLiteral.value === 'number' &&
              isMagicNumber(esLiteral.value)
            ) {
              signals.magicLiterals++;
              issues.push({
                type: IssueType.MagicLiteral,
                category: CATEGORY_MAGIC_LITERAL,
                severity: Severity.Minor,
                message: `Magic number ${esLiteral.value} — AI will invent wrong semantics. Extract to a named constant.`,
                location: {
                  file: filePath,
                  line: esLiteral.loc?.start.line || 1,
                  column: esLiteral.loc?.start.column,
                },
                suggestion: `const MEANINGFUL_NAME = ${esLiteral.value};`,
              });
            } else if (
              typeof esLiteral.value === 'string' &&
              isMagicString(esLiteral.value)
            ) {
              const isDomain =
                domainVocabulary &&
                domainVocabulary.has(esLiteral.value.toLowerCase());
              if (!isDomain) {
                signals.magicLiterals++;
                issues.push({
                  type: IssueType.MagicLiteral,
                  category: CATEGORY_MAGIC_LITERAL,
                  severity: Severity.Info,
                  message: `Magic string "${esLiteral.value}" — intent is ambiguous to AI. Consider a named constant.`,
                  location: {
                    file: filePath,
                    line: esLiteral.loc?.start.line || 1,
                  },
                });
              }
            }
          }
        }
      }
    }

    // --- Boolean Traps ---
    // Skip boolean trap detection for CLI command files (standard pattern)
    if (!isCliCommand) {
      checkBooleanTraps(node, parent, isTreeSitter);
    }

    // --- Ambiguous Names ---
    if (options.checkAmbiguousNames !== false) {
      if (isTreeSitter) {
        const tsNode = node as Parser.Node;
        if (tsNode.type === 'variable_declarator') {
          const nameNode = tsNode.childForFieldName('name');
          if (nameNode && isAmbiguousName(nameNode.text)) {
            signals.ambiguousNames++;
            issues.push({
              type: IssueType.AmbiguousApi,
              category: CATEGORY_AMBIGUOUS_NAME,
              severity: Severity.Info,
              message: `Ambiguous variable name "${nameNode.text}" — AI intent is unclear.`,
              location: { file: filePath, line: tsNode.startPosition.row + 1 },
            });
          }
        }
      } else {
        const esNode = node as TSESTree.Node;
        if (
          esNode.type === 'VariableDeclarator' &&
          esNode.id.type === 'Identifier'
        ) {
          if (isAmbiguousName(esNode.id.name)) {
            const isDataFromJson =
              esNode.id.name === 'data' &&
              esNode.init &&
              ctx.code
                .slice(
                  (esNode.init as any).range?.[0] || 0,
                  (esNode.init as any).range?.[1] || 0
                )
                .includes('.json()');
            if (!isDataFromJson) {
              signals.ambiguousNames++;
              issues.push({
                type: IssueType.AmbiguousApi,
                category: CATEGORY_AMBIGUOUS_NAME,
                severity: Severity.Info,
                message: `Ambiguous variable name "${esNode.id.name}" — AI intent is unclear.`,
                location: { file: filePath, line: esNode.loc?.start.line || 1 },
              });
            }
          }
        }
      }
    }

    // --- Callback Depth ---
    const nodeType = (
      (isTreeSitter
        ? (node as Parser.Node).type
        : (node as TSESTree.Node).type) || ''
    ).toLowerCase();
    const isFunction =
      nodeType.includes('function') ||
      nodeType.includes('arrow') ||
      nodeType.includes('lambda') ||
      nodeType === 'method_declaration';

    if (isFunction) {
      callbackDepth++;
      maxCallbackDepth = Math.max(maxCallbackDepth, callbackDepth);
    }

    // Recurse children
    if ('namedChildren' in node) {
      for (const child of node.namedChildren) visitNode(child, node);
    } else {
      const estreeNode = node as any;
      for (const key in estreeNode) {
        if (['parent', 'loc', 'range', 'tokens'].includes(key)) continue;
        const child = estreeNode[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach((c) => {
              if (c && typeof c.type === 'string') {
                c.parent = estreeNode;
                visitNode(c, estreeNode, key);
              }
            });
          } else if (typeof child.type === 'string') {
            child.parent = estreeNode;
            visitNode(child, estreeNode, key);
          }
        }
      }
    }

    if (isFunction) callbackDepth--;
  };

  // Start visiting
  if ('rootNode' in ast) visitNode(ast.rootNode);
  else visitNode(ast as TSESTree.Node);

  if (
    options.checkDeepCallbacks !== false &&
    maxCallbackDepth >= CALLBACK_DEPTH_THRESHOLD
  ) {
    signals.deepCallbacks = maxCallbackDepth - (CALLBACK_DEPTH_THRESHOLD - 1);
    issues.push({
      type: IssueType.AiSignalClarity,
      category: CATEGORY_DEEP_CALLBACK,
      severity: Severity.Major,
      message: `Deeply nested logic (depth ${maxCallbackDepth}) — AI loses control flow context beyond ${CALLBACK_DEPTH_THRESHOLD} levels.`,
      location: { file: filePath, line: 1 },
      suggestion:
        'Extract nested logic into named functions or flatten the structure.',
    });
  }

  return { issues, signals };
}
