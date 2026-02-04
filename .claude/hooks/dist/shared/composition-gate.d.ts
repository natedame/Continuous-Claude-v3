/**
 * Composition Gate (Gate 3)
 *
 * Validates pattern algebra rules before orchestration.
 * Part of the 3-gate system: Erotetic -> Resources -> Composition.
 */
import { type ValidationResult, type PatternType, type ScopeType, type OperatorType } from './pattern-selector.js';
/**
 * Error thrown when pattern composition validation fails.
 */
export declare class CompositionInvalidError extends Error {
    readonly errors: string[];
    constructor(errors: string[]);
}
/**
 * Gate 3: Composition validation.
 *
 * Validates pattern algebra rules before orchestration.
 * Throws CompositionInvalidError if validation fails.
 *
 * @param patternA - First pattern name
 * @param patternB - Second pattern name
 * @param scope - State sharing scope (default: 'handoff')
 * @param operator - Composition operator (default: ';')
 * @returns ValidationResult if valid
 * @throws CompositionInvalidError if invalid
 */
export declare function gate3Composition(patternA: string, patternB: string, scope?: ScopeType, operator?: OperatorType): ValidationResult;
/**
 * Validate a chain of patterns.
 *
 * @param patterns - Array of pattern names to compose
 * @param scope - State sharing scope (default: 'handoff')
 * @param operator - Composition operator (default: ';')
 * @returns ValidationResult if valid
 * @throws CompositionInvalidError if invalid
 */
export declare function gate3CompositionChain(patterns: PatternType[], scope?: ScopeType, operator?: OperatorType): ValidationResult;
