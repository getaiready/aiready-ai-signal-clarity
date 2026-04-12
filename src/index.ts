import { ToolRegistry } from '@aiready/core';
import { AI_SIGNAL_CLARITY_PROVIDER } from './provider';

// Register with global registry
ToolRegistry.register(AI_SIGNAL_CLARITY_PROVIDER);

export { analyzeAiSignalClarity } from './analyzer';
export { calculateAiSignalClarityScore } from './scoring';
export {
  performSignalClarityScan,
  performSignalClarityScan as scanFile,
} from './scanner';
export { AI_SIGNAL_CLARITY_PROVIDER };
export type {
  AiSignalClarityOptions,
  AiSignalClarityReport,
  AiSignalClarityIssue,
  FileAiSignalClarityResult,
} from './types';
