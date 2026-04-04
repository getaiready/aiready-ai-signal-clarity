/**
 * Signal detection helpers for AI Signal Clarity.
 */

import { classifyStringLiteral, StringCategory } from './string-classifier';
import {
  AMBIGUOUS_NAME_PATTERNS,
  MAGIC_LITERAL_IGNORE,
  MAGIC_STRING_IGNORE,
  TAILWIND_PATTERN,
  DESCRIPTIVE_NAME_PATTERN,
} from './helpers/constants';

export {
  AMBIGUOUS_NAME_PATTERNS,
  MAGIC_LITERAL_IGNORE,
  MAGIC_STRING_IGNORE,
  TAILWIND_PATTERN,
  DESCRIPTIVE_NAME_PATTERN,
};

export function isAmbiguousName(name: string): boolean {
  return AMBIGUOUS_NAME_PATTERNS.some((p) => p.test(name));
}

export function isMagicNumber(value: number): boolean {
  // Ignore common infrastructure and time constants
  const infrastructureIgnores = new Set([
    3600, // 1 hour
    86400, // 1 day
    15000,
    5000,
    1000, // standard delays/intervals
    10,
    20,
    30, // standard retry/polling limits
  ]);

  return !MAGIC_LITERAL_IGNORE.has(value) && !infrastructureIgnores.has(value);
}

export function isMagicString(value: string): boolean {
  if (value.length === 0) return false;
  if (value.length > 30) return false; // Increased from 20 to allow some ARNs/endpoints
  if (MAGIC_STRING_IGNORE.has(value.toLowerCase())) return false;

  // AWS and Cloud patterns
  if (/^arn:aws:[a-z0-9-]+:[a-z0-9-]*:[0-9]{12}:/.test(value)) return false; // ARNs
  if (/^[a-z0-9-]+\.amazonaws\.com$/.test(value)) return false; // Service endpoints
  if (/^[a-z]{2}-(?:north|south|east|west|central)-[1-3]$/.test(value))
    return false; // Regions (e.g. us-east-1)
  if (value === '2012-10-17' || value === '2012-10-27') return false; // IAM Policy versions
  if (value.startsWith('OrganizationAccountAccessRole')) return false; // AWS default role

  if (TAILWIND_PATTERN.test(value) && value.includes('-')) return false;
  if (/^(gpt|claude|gemini|llama|mixtral|anthropic|openai)-/i.test(value))
    return false;
  if (/^(rate|cron)\(.+\)$/.test(value)) return false; // AWS EventBridge expressions
  if (value === value.toUpperCase() && value.length > 3) return false;
  if (DESCRIPTIVE_NAME_PATTERN.test(value)) return false;
  if (/[/.]/.test(value)) return false;
  if (/^#[0-9a-fA-F]{3,6}$/.test(value)) return false;
  if (/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|ms|s|deg)$/.test(value)) return false; // CSS units
  if (/^[a-z]{2}([-_][A-Z]{2})?$/.test(value)) return false; // Locales like "en" or "en_US"

  // Use the classifier to distinguish between meaningful and UI strings
  const category = classifyStringLiteral(value);
  // Only flag meaningful strings as magic literals, not UI display strings
  if (category === StringCategory.UiDisplay) {
    return false;
  }

  return !/^\s+$/.test(value);
}

export function isRedundantTypeConstant(name: string, value: any): boolean {
  if (typeof value !== 'string') return false;

  const typeMap: Record<string, string> = {
    TYPE_STRING: 'string',
    TYPE_OBJECT: 'object',
    TYPE_ARRAY: 'array',
    TYPE_NUMBER: 'number',
    TYPE_BOOLEAN: 'boolean',
    TYPE_INTEGER: 'integer',
  };

  // Check for exact matches first
  if (typeMap[name] === value) return true;

  // Check for prefix matches e.g. JSON_TYPE_STRING = 'string'
  for (const [key, val] of Object.entries(typeMap)) {
    if (name.endsWith(key) && value === val) return true;
  }

  return false;
}
