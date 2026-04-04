import { Severity, IssueType, SignalContext } from './types';
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
} from './constants';
import type { TSESTree } from '@typescript-eslint/types';
import type * as Parser from 'web-tree-sitter';
import {
  isLambdaHandlerFile,
  isLambdaBooleanParam,
  isReactStateSetter,
} from './visitor-helpers';

/**
 * Helper to check magic literals for Tree-sitter nodes.
 */
export function checkTreeSitterLiterals(
  tsNode: Parser.Node,
  ctx: {
    filePath: string;
    domainVocabulary?: Set<string>;
    signals: { magicLiterals: number };
    issues: any[];
  }
) {
  const { filePath, domainVocabulary, signals, issues } = ctx;

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

    // Walk up the tree to detect named constants
    let isNamedConstant = false;
    let p: any = tsNode.parent;
    let depth = 0;
    while (p && depth < 10) {
      if (p.type === 'variable_declarator') {
        const nameNode = p.childForFieldName('name');
        if (nameNode && /^[A-Z0-9_]{2,}$/.test(nameNode.text)) {
          isNamedConstant = true;
          break;
        }
      }
      if (
        ['pair', 'object', 'array', 'as_expression', 'type_assertion'].includes(
          p.type
        )
      ) {
        p = p.parent;
        depth++;
      } else break;
    }

    const parentName = tsNode.parent?.childForFieldName('name')?.text || '';
    if (!isKey && !isImport && isRedundantTypeConstant(parentName, val)) {
      issues.push({
        type: IssueType.AiSignalClarity,
        category: CATEGORY_REDUNDANT_TYPE_CONSTANT,
        severity: Severity.Minor,
        message: `Redundant type constant '${parentName}' — in modern AI-native code, use literals or centralized union types for transparency.`,
        location: { file: filePath, line: tsNode.startPosition.row + 1 },
        suggestion: `Use '${val}' directly in your schema.`,
      });
    } else if (!isKey && !isImport && !isNamedConstant && isMagicString(val)) {
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
}

/**
 * Helper to check magic literals for ESTree nodes.
 */
export function checkEsTreeLiterals(
  esNode: TSESTree.Literal,
  parent: TSESTree.Node | undefined,
  keyInParent: string | undefined,
  ctx: {
    filePath: string;
    domainVocabulary?: Set<string>;
    signals: { magicLiterals: number };
    issues: any[];
    isConfigFile: boolean;
  }
) {
  const { filePath, domainVocabulary, signals, issues, isConfigFile } = ctx;
  const esParent = parent;

  // Check if it is a named constant (UPPER_SNAKE_CASE)
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

  const isObjectKey = esParent?.type === 'Property' && keyInParent === 'key';
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
  const isIgnoredProperty =
    esParent?.type === 'Property' &&
    esParent.key.type === 'Identifier' &&
    [
      'region',
      'endpoint',
      'Bucket',
      'RoleArn',
      'maxRetries',
      'delayMs',
      'DurationSeconds',
      'AccountName',
      'Email',
      'RoleName',
      'ThumbprintList',
      'Sid',
      'Effect',
      'Action',
      'Resource',
      'Principal',
      'Federated',
      'Url',
      'ClientIDList',
      'ResourceId',
      'ServiceRole',
      'AccountName',
      'Key',
      'Value',
      'title',
      'description',
      'alt',
      'name',
      'card',
      'locale',
      'themeColor',
      'colorScheme',
      'Version',
      'Statement',
      'RoleSessionName',
      'Condition',
      'StringLike',
      'StringEquals',
      'PolicyName',
      'PolicyDocument',
      'AssumeRolePolicyDocument',
    ].includes(esParent.key.name);

  const isParserFile = filePath.includes('parser');

  let parentName = '';
  if (
    esParent?.type === 'VariableDeclarator' &&
    esParent.id.type === 'Identifier'
  ) {
    parentName = esParent.id.name;
  } else if (
    esParent?.type === 'Property' &&
    esParent.key.type === 'Identifier'
  ) {
    parentName = esParent.key.name;
  }

  // --- Redundant Type Constants (independent of naming) ---
  if (
    typeof esNode.value === 'string' &&
    isRedundantTypeConstant(parentName, esNode.value)
  ) {
    issues.push({
      type: IssueType.AiSignalClarity,
      category: CATEGORY_REDUNDANT_TYPE_CONSTANT,
      severity: Severity.Minor,
      message: `Redundant type constant '${parentName}' — in modern AI-native code, use literals or centralized union types for transparency.`,
      location: { file: filePath, line: esNode.loc?.start.line || 1 },
      suggestion: `Use '${esNode.value}' directly in your code.`,
    });
  }

  let isStyleValue = false;
  if (esParent?.type === 'Property' && keyInParent === 'value') {
    let p: any = esParent.parent;
    while (p && p.type === 'ObjectExpression') {
      const gp = p.parent;
      if (
        gp?.type === 'JSXExpressionContainer' &&
        gp.parent?.type === 'JSXAttribute' &&
        gp.parent.name?.name === 'style'
      ) {
        isStyleValue = true;
        break;
      }
      p = gp?.type === 'Property' ? gp.parent : undefined;
    }
  }

  if (
    !(
      isNamedConstant ||
      isObjectKey ||
      isJSXAttribute ||
      isImportSource ||
      isRequireArg ||
      isStyleValue ||
      isIgnoredProperty ||
      isParserFile ||
      (isConfigFile && typeof esNode.value === 'string')
    )
  ) {
    if (typeof esNode.value === 'number' && isMagicNumber(esNode.value)) {
      signals.magicLiterals++;
      issues.push({
        type: 'magic-literal',
        category: CATEGORY_MAGIC_LITERAL,
        severity: 'minor',
        message: `Magic number ${esNode.value} — AI will invent wrong semantics. Extract to a named constant.`,
        location: {
          file: filePath,
          line: esNode.loc?.start.line || 1,
          column: esNode.loc?.start.column,
        },
        suggestion: `const MEANINGFUL_NAME = ${esNode.value};`,
      });
    } else if (
      typeof esNode.value === 'string' &&
      isMagicString(esNode.value)
    ) {
      const isDomain =
        domainVocabulary && domainVocabulary.has(esNode.value.toLowerCase());
      if (!isDomain) {
        signals.magicLiterals++;
        issues.push({
          type: 'magic-literal',
          category: CATEGORY_MAGIC_LITERAL,
          severity: 'info',
          message: `Magic string "${esNode.value}" — intent is ambiguous to AI. Consider a named constant.`,
          location: { file: filePath, line: esNode.loc?.start.line || 1 },
        });
      }
    }
  }
}

/**
 * Helper to check for boolean traps.
 */
export function checkBooleanTraps(
  node: any,
  parent: any,
  isTreeSitter: boolean,
  ctx: {
    filePath: string;
    options: any;
    signals: { booleanTraps: number };
    issues: any[];
  }
) {
  const { filePath, options, signals, issues } = ctx;
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
        const isReactSetter = isReactStateSetter(esNode);
        const isUseStateCall =
          esNode.callee?.type === 'Identifier' &&
          esNode.callee?.name === 'useState';
        if (
          !isLambdaContext &&
          !isLambdaBool &&
          !isUseStateCall &&
          !isReactSetter
        ) {
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
}

/**
 * Check if a name is ambiguous for AI.
 */
export function checkAmbiguousName(
  node: TSESTree.Node | Parser.Node,
  ctx: {
    filePath: string;
    code: string;
    options: any;
    signals: { ambiguousNames: number };
    issues: any[];
  }
) {
  const { filePath, code, options, signals, issues } = ctx;
  if (options.checkAmbiguousNames === false) return;

  const isTreeSitter = 'namedChildren' in node;

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
          code
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
