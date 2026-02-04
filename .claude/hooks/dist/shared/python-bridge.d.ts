/**
 * Python Bridge
 *
 * Subprocess wrappers to call Python validation and inference scripts.
 * Provides type-safe interface between TypeScript hooks and Python logic.
 */
import type { ValidationResult, PatternInferenceResult } from './pattern-selector.js';
/**
 * Call Python validate_composition.py with JSON output.
 *
 * @param patternA - First pattern name
 * @param patternB - Second pattern name
 * @param scope - State sharing scope
 * @param operator - Composition operator
 * @returns ValidationResult with validity, errors, warnings, and scope trace
 */
export declare function callValidateComposition(patternA: string, patternB: string, scope: string, operator?: string): ValidationResult;
/**
 * Call Python pattern_inference.py to infer best pattern for a task.
 *
 * @param prompt - Task description
 * @returns PatternInferenceResult with pattern, confidence, and signals
 */
export declare function callPatternInference(prompt: string): PatternInferenceResult;
