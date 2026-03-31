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
  return !MAGIC_LITERAL_IGNORE.has(value);
}

export function isMagicString(value: string): boolean {
  if (value.length === 0) return false;
  if (value.length > 20) return false;
  if (MAGIC_STRING_IGNORE.has(value.toLowerCase())) return false;

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
