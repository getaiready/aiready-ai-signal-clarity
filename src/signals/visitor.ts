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

  const { filePath, options } = ctx;

  let callbackDepth = 0;
  let maxCallbackDepth = 0;

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

        const parentName =
          node.parent?.nameNode?.text ||
          node.parent?.childForFieldName('name')?.text ||
          '';

        if (!isKey && isRedundantTypeConstant(parentName, val)) {
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
        } else if (!isKey && isMagicString(val)) {
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
        } else if (isNamedConstant || isObjectKey || isJSXAttribute) {
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

    // --- Boolean Traps ---
    if (options.checkBooleanTraps !== false) {
      // Tree-sitter
      if (node.type === 'argument_list') {
        const hasBool = node.namedChildren?.some(
          (c: any) =>
            c.type === 'true' ||
            c.type === 'false' ||
            (c.type === 'boolean' && (c.text === 'true' || c.text === 'false'))
        );
        if (hasBool) {
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
      // ESTree
      else if (node.type === 'CallExpression') {
        const hasBool = node.arguments.some(
          (arg: any) => arg.type === 'Literal' && typeof arg.value === 'boolean'
        );
        if (hasBool) {
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
