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

/**
 * Detect if a file is likely a Lambda handler or serverless function.
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
 * Check if a boolean value is a common Lambda/Serverless parameter.
 */
function isLambdaBooleanParam(node: any, parent?: any): boolean {
  // Check if the boolean is part of a Lambda event/context
  if (!parent) return false;

  // Common Lambda boolean parameters
  const lambdaBooleans = new Set([
    'isBase64Encoded',
    'isBase64',
    'multiValueHeaders',
    'queryStringParameters',
    'pathParameters',
    'stageVariables',
  ]);

  // Check if parent is a Property and key is a Lambda boolean
  if (parent.type === 'Property' && parent.key) {
    const keyName = parent.key.name || parent.key.value;
    if (lambdaBooleans.has(keyName)) {
      return true;
    }
  }

  return false;
}

/**
 * Traverses the AST and detects structural signals like magic literals and boolean traps.
 */
export function detectStructuralSignals(
  ctx: SignalContext,
  ast: any
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

  const visitNode = (node: any, parent?: any, keyInParent?: string) => {
    if (!node) return;

    // --- Magic Literals ---
    if (options.checkMagicLiterals !== false) {
      // Tree-sitter (Python, Java, etc.)
      if (node.type === 'number') {
        const val = parseFloat(node.text);
        if (!isNaN(val) && isMagicNumber(val)) {
          signals.magicLiterals++;
          issues.push({
            type: IssueType.MagicLiteral,
            category: CATEGORY_MAGIC_LITERAL,
            severity: Severity.Minor,
            message: `Magic number ${node.text} — AI will invent wrong semantics. Extract to a named constant.`,
            location: {
              file: filePath,
              line: node.startPosition.row + 1,
              column: node.startPosition.column,
            },
            suggestion: `const MEANINGFUL_NAME = ${node.text};`,
          });
        }
      } else if (node.type === 'string' || node.type === 'string_literal') {
        const val = node.text.replace(/['"]/g, '');
        // Heuristic: ignore if it's likely a key in a map/dictionary (Tree-sitter)
        const isKey =
          node.parent?.type?.includes('pair') ||
          node.parent?.type === 'assignment_expression';

        // Skip if it's an import/require/use statement (Tree-sitter)
        const isImport =
          node.parent?.type?.toLowerCase().includes('import') ||
          node.parent?.type?.toLowerCase().includes('require') ||
          node.parent?.type?.toLowerCase().includes('use');

        const parentName =
          node.parent?.nameNode?.text ||
          node.parent?.childForFieldName('name')?.text ||
          '';

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
            location: {
              file: filePath,
              line: node.startPosition.row + 1,
            },
            suggestion: `Use '${val}' directly in your schema.`,
          });
        } else if (
          !isKey &&
          !isImport &&
          !isNamedConstant &&
          isMagicString(val)
        ) {
          // Check if this is a domain-specific term
          const isDomain =
            domainVocabulary && domainVocabulary.has(val.toLowerCase());

          if (!isDomain) {
            signals.magicLiterals++;
            issues.push({
              type: IssueType.MagicLiteral,
              category: CATEGORY_MAGIC_LITERAL,
              severity: Severity.Info,
              message: `Magic string "${val}" — intent is ambiguous to AI. Consider a named constant.`,
              location: {
                file: filePath,
                line: node.startPosition.row + 1,
              },
            });
          }
        }
      }
      // ESTree (TypeScript, JavaScript)
      else if (node.type === 'Literal') {
        let isNamedConstant = false;

        // Check if this literal is part of a constant declaration (possibly nested in Array/Set/Object)
        let depth = 0;
        let p = parent;
        while (p && depth < 5) {
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
          } else {
            break;
          }
        }

        // Fallback for manual recursion where .parent might not be set on nodes
        if (!isNamedConstant) {
          isNamedConstant =
            parent?.type === 'VariableDeclarator' &&
            parent.id.type === 'Identifier' &&
            /^[A-Z0-9_]{2,}$/.test(parent.id.name);

          if (!isNamedConstant && parent?.type === 'ArrayExpression') {
            // We don't have grandparent here easily without changing visitNode signature
            // or relying on .parent being set.
          }
        }

        const isObjectKey =
          parent?.type === 'Property' && keyInParent === 'key';

        const isJSXAttribute = parent?.type === 'JSXAttribute';

        // Skip magic literal check for import/export sources (Category 1)
        const isImportSource =
          (parent?.type === 'ImportDeclaration' ||
            parent?.type === 'ExportNamedDeclaration' ||
            parent?.type === 'ExportAllDeclaration') &&
          keyInParent === 'source';

        // Skip magic literal check for common require arg (Category 1)
        const isRequireArg =
          parent?.type === 'CallExpression' &&
          parent.callee?.type === 'Identifier' &&
          parent.callee?.name === 'require';

        // Check if this is a value in a JSX style object (Issue: Context-Blind CSS analysis)
        let isStyleValue = false;
        if (parent?.type === 'Property' && keyInParent === 'value') {
          let p = parent.parent; // ObjectExpression
          while (p && p.type === 'ObjectExpression') {
            const grandParent = p.parent;
            if (grandParent?.type === 'JSXExpressionContainer') {
              const attr = grandParent.parent;
              if (
                attr?.type === 'JSXAttribute' &&
                attr.name?.type === 'JSXIdentifier' &&
                attr.name.name === 'style'
              ) {
                isStyleValue = true;
                break;
              }
            }
            // Could be nested: style={{ base: { display: 'flex' } }}
            p = grandParent?.type === 'Property' ? grandParent.parent : null;
          }
        }

        const redundantType =
          typeof node.value === 'string'
            ? isRedundantTypeConstant(
                parent?.type === 'VariableDeclarator' &&
                  parent.id.type === 'Identifier'
                  ? parent.id.name
                  : '',
                node.value
              )
            : false;

        if (redundantType) {
          issues.push({
            type: IssueType.AiSignalClarity,
            category: CATEGORY_REDUNDANT_TYPE_CONSTANT,
            severity: Severity.Minor,
            message: `Redundant type constant "${parent.id.name}" = '${
              node.value
            }' — in modern AI-native code, use literals or centralized union types for transparency.`,
            location: {
              file: filePath,
              line: node.loc?.start.line || 1,
            },
            suggestion: `Use '${node.value}' directly in your schema.`,
          });
        } else if (
          isNamedConstant ||
          isObjectKey ||
          isJSXAttribute ||
          isImportSource ||
          isRequireArg ||
          isStyleValue ||
          (isConfigFile && typeof node.value === 'string')
        ) {
          // Skip magic literal check for these contextually safe literals
        } else if (
          typeof node.value === 'number' &&
          isMagicNumber(node.value)
        ) {
          signals.magicLiterals++;
          issues.push({
            type: IssueType.MagicLiteral,
            category: CATEGORY_MAGIC_LITERAL,
            severity: Severity.Minor,
            message: `Magic number ${node.value} — AI will invent wrong semantics. Extract to a named constant.`,
            location: {
              file: filePath,
              line: node.loc?.start.line || 1,
              column: node.loc?.start.column,
            },
            suggestion: `const MEANINGFUL_NAME = ${node.value};`,
          });
        } else if (
          typeof node.value === 'string' &&
          isMagicString(node.value)
        ) {
          // Check if this is a domain-specific term
          const isDomain =
            domainVocabulary && domainVocabulary.has(node.value.toLowerCase());

          if (!isDomain) {
            signals.magicLiterals++;
            issues.push({
              type: IssueType.MagicLiteral,
              category: CATEGORY_MAGIC_LITERAL,
              severity: Severity.Info,
              message: `Magic string "${node.value}" — intent is ambiguous to AI. Consider a named constant.`,
              location: {
                file: filePath,
                line: node.loc?.start.line || 1,
              },
            });
          }
        }
      }
    }

    // --- Boolean Traps ---
    if (options.checkBooleanTraps !== false) {
      const isLambdaContext = isLambdaHandlerFile(filePath);

      // Tree-sitter
      if (node.type === 'argument_list') {
        const hasBool = node.namedChildren?.some(
          (c: any) =>
            c.type === 'true' ||
            c.type === 'false' ||
            (c.type === 'boolean' && (c.text === 'true' || c.text === 'false'))
        );
        if (hasBool) {
          // Skip if this is a Lambda context
          if (!isLambdaContext) {
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
      }
      // ESTree
      else if (node.type === 'CallExpression') {
        const hasBool = node.arguments.some(
          (arg: any) => arg.type === 'Literal' && typeof arg.value === 'boolean'
        );
        if (hasBool) {
          // Check if this is a Lambda-specific boolean
          const isLambdaBool = node.arguments.some((arg: any) =>
            isLambdaBooleanParam(arg, node.parent)
          );
          const isUseStateCall =
            node.callee?.type === 'Identifier' &&
            node.callee?.name === 'useState';

          if (!isLambdaContext && !isLambdaBool && !isUseStateCall) {
            signals.booleanTraps++;
            issues.push({
              type: IssueType.BooleanTrap,
              category: CATEGORY_BOOLEAN_TRAP,
              severity: Severity.Major,
              message: `Boolean trap: positional boolean argument at call site. AI inverts intent ~30% of the time.`,
              location: {
                file: filePath,
                line: node.loc?.start.line || 1,
              },
              suggestion:
                'Replace boolean arg with a named options object or separate functions.',
            });
          }
        }
      }
    }

    // --- Ambiguous Names ---
    if (options.checkAmbiguousNames !== false) {
      // Tree-sitter
      if (node.type === 'variable_declarator') {
        const nameNode = node.childForFieldName('name');
        if (nameNode && isAmbiguousName(nameNode.text)) {
          signals.ambiguousNames++;
          issues.push({
            type: IssueType.AmbiguousApi,
            category: CATEGORY_AMBIGUOUS_NAME,
            severity: Severity.Info,
            message: `Ambiguous variable name "${nameNode.text}" — AI intent is unclear.`,
            location: {
              file: filePath,
              line: node.startPosition.row + 1,
            },
          });
        }
      }
      // ESTree
      else if (
        node.type === 'VariableDeclarator' &&
        node.id.type === 'Identifier'
      ) {
        if (isAmbiguousName(node.id.name)) {
          // Relax for 'data' when initialized from obvious sources (Issue: Universal pattern context)
          const isDataFromJson =
            node.id.name === 'data' &&
            node.init &&
            ctx.code
              .slice(node.init.range?.[0] || 0, node.init.range?.[1] || 0)
              .includes('.json()');

          if (!isDataFromJson) {
            signals.ambiguousNames++;
            issues.push({
              type: IssueType.AmbiguousApi,
              category: CATEGORY_AMBIGUOUS_NAME,
              severity: Severity.Info,
              message: `Ambiguous variable name "${node.id.name}" — AI intent is unclear.`,
              location: {
                file: filePath,
                line: node.loc?.start.line || 1,
              },
            });
          }
        }
      }
    }

    // --- Callback Depth ---
    const nodeType = (node.type || '').toLowerCase();
    const isFunction =
      nodeType.includes('function') ||
      nodeType.includes('arrow') ||
      nodeType.includes('lambda') ||
      nodeType === 'method_declaration';

    if (isFunction) {
      callbackDepth++;
      maxCallbackDepth = Math.max(maxCallbackDepth, callbackDepth);
    }

    // Recurse Tree-sitter
    if (node.namedChildren) {
      for (const child of node.namedChildren) {
        visitNode(child, node);
      }
    }
    // Recurse ESTree
    else {
      for (const key in node) {
        if (
          key === 'parent' ||
          key === 'loc' ||
          key === 'range' ||
          key === 'tokens'
        )
          continue;
        const child = node[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach((c) => {
              if (c && typeof c.type === 'string') {
                c.parent = node;
                visitNode(c, node, key);
              }
            });
          } else if (typeof child.type === 'string') {
            child.parent = node;
            visitNode(child, node, key);
          }
        }
      }
    }

    if (isFunction) {
      callbackDepth--;
    }
  };

  // Start visiting
  if (ast.rootNode) {
    visitNode(ast.rootNode); // Tree-sitter
  } else {
    visitNode(ast); // ESTree
  }

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
      location: {
        file: filePath,
        line: 1,
      },
      suggestion:
        'Extract nested logic into named functions or flatten the structure.',
    });
  }

  return { issues, signals };
}
