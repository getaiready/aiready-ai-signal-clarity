/**
 * Constants for AI Signal Clarity detection.
 */

export const AMBIGUOUS_NAME_PATTERNS = [
  /^[a-ce-hj-z]$/, // single letter except d, i, s (common/accepted)
  /^(tmp|temp|data|obj|val|res|ret|elem|thing|stuff|info|misc|util|helper|fn|func)$/i,
  /^[a-rt-z]\d+$/, // x1, x2, n3 (except s3)
];

export const TAILWIND_PATTERN = /^[a-z0-9:-]+(\/[0-9]+)?$/;
export const DESCRIPTIVE_NAME_PATTERN =
  /^([A-Z]+[a-z0-9]*){2,}$|^([a-z]+[a-z0-9]*)([A-Z]+[a-z0-9]*)+$/;
