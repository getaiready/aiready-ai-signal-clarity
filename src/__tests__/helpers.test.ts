import { describe, it, expect } from 'vitest';
import {
  isAmbiguousName,
  isMagicNumber,
  isMagicString,
  isRedundantTypeConstant,
} from '../helpers';

describe('isAmbiguousName', () => {
  it('should detect single letter names as ambiguous', () => {
    expect(isAmbiguousName('a')).toBe(true);
    expect(isAmbiguousName('x')).toBe(true);
    expect(isAmbiguousName('z')).toBe(true);
  });

  it('should detect common ambiguous patterns', () => {
    expect(isAmbiguousName('tmp')).toBe(true);
    expect(isAmbiguousName('temp')).toBe(true);
    expect(isAmbiguousName('data')).toBe(true);
    expect(isAmbiguousName('obj')).toBe(true);
    expect(isAmbiguousName('val')).toBe(true);
    expect(isAmbiguousName('res')).toBe(true);
    expect(isAmbiguousName('result')).toBe(true);
    expect(isAmbiguousName('item')).toBe(true);
  });

  it('should detect letter-digit patterns as ambiguous', () => {
    expect(isAmbiguousName('x1')).toBe(true);
    expect(isAmbiguousName('n3')).toBe(true);
    expect(isAmbiguousName('a10')).toBe(true);
  });

  it('should accept descriptive names', () => {
    expect(isAmbiguousName('userName')).toBe(false);
    expect(isAmbiguousName('getData')).toBe(false);
    expect(isAmbiguousName('processItem')).toBe(false);
  });
});

describe('isMagicNumber', () => {
  it('should accept common ignored numbers', () => {
    expect(isMagicNumber(0)).toBe(false);
    expect(isMagicNumber(1)).toBe(false);
    expect(isMagicNumber(-1)).toBe(false);
    expect(isMagicNumber(2)).toBe(false);
    expect(isMagicNumber(10)).toBe(false);
    expect(isMagicNumber(100)).toBe(false);
    expect(isMagicNumber(1000)).toBe(false);
  });

  it('should accept HTTP port numbers', () => {
    expect(isMagicNumber(80)).toBe(false);
    expect(isMagicNumber(443)).toBe(false);
    expect(isMagicNumber(8080)).toBe(false);
  });

  it('should flag other numbers as magic', () => {
    expect(isMagicNumber(42)).toBe(true);
    expect(isMagicNumber(123)).toBe(true);
    expect(isMagicNumber(999)).toBe(true);
  });
});

describe('isMagicString', () => {
  it('should accept empty and whitespace strings', () => {
    expect(isMagicString('')).toBe(false);
    expect(isMagicString(' ')).toBe(false);
    expect(isMagicString('\n')).toBe(false);
    expect(isMagicString('\t')).toBe(false);
  });

  it('should accept ignored common strings', () => {
    expect(isMagicString('utf8')).toBe(false);
    expect(isMagicString('utf-8')).toBe(false);
    expect(isMagicString('true')).toBe(false);
    expect(isMagicString('false')).toBe(false);
    expect(isMagicString('null')).toBe(false);
    expect(isMagicString('undefined')).toBe(false);
  });

  it('should accept descriptive strings', () => {
    expect(isMagicString('userName')).toBe(false);
    expect(isMagicString('getData')).toBe(false);
    expect(isMagicString('processItem')).toBe(false);
  });

  it('should accept all-caps abbreviations', () => {
    expect(isMagicString('API')).toBe(false);
    expect(isMagicString('JSON')).toBe(false);
    expect(isMagicString('HTTP')).toBe(false);
  });

  it('should flag short ambiguous strings as magic', () => {
    expect(isMagicString('abc')).toBe(true);
    expect(isMagicString('xyz')).toBe(true);
  });
});

describe('isRedundantTypeConstant', () => {
  it('should detect exact type matches', () => {
    expect(isRedundantTypeConstant('TYPE_STRING', 'string')).toBe(true);
    expect(isRedundantTypeConstant('TYPE_NUMBER', 'number')).toBe(true);
    expect(isRedundantTypeConstant('TYPE_BOOLEAN', 'boolean')).toBe(true);
  });

  it('should detect prefix matches', () => {
    expect(isRedundantTypeConstant('JSON_TYPE_STRING', 'string')).toBe(true);
    expect(isRedundantTypeConstant('USER_TYPE_NUMBER', 'number')).toBe(true);
  });

  it('should reject non-string values', () => {
    expect(isRedundantTypeConstant('TYPE_STRING', 123)).toBe(false);
    expect(isRedundantTypeConstant('TYPE_STRING', true)).toBe(false);
  });

  it('should reject non-matching constants', () => {
    expect(isRedundantTypeConstant('TYPE_STRING', 'number')).toBe(false);
    expect(isRedundantTypeConstant('USER_NAME', 'string')).toBe(false);
  });
});
