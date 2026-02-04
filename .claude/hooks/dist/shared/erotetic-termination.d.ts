/**
 * Erotetic Termination Logic - Phase 9 of Self-Improving Skill System
 *
 * Termination conditions for the erotetic loop:
 * 1. All Q-heuristics resolved (E(X,Q)=empty)
 * 2. User says "use defaults"
 * 3. Hard cap hit (max 4 questions already asked)
 *
 * Plan reference: thoughts/shared/plans/self-improving-skill-system.md (Phase 9)
 */
import type { QHeuristic } from './erotetic-questions.js';
/**
 * State of the termination check.
 * Tracks what has been resolved and what remains.
 */
export interface TerminationState {
    /** Q-heuristic id -> user answer */
    resolved: Record<string, string>;
    /** Q-heuristics that still need answers */
    unresolved: QHeuristic[];
    /** Number of questions already asked */
    questionsAsked: number;
    /** Whether user explicitly requested defaults */
    userRequestedDefaults: boolean;
}
/**
 * Result of the termination check.
 */
export interface TerminationResult {
    /** Whether the questioning loop should end */
    shouldTerminate: boolean;
    /** Reason for termination (or 'continue' if not terminating) */
    reason: 'all_resolved' | 'defaults_requested' | 'max_questions' | 'continue';
    /** Final resolution with defaults applied if needed */
    finalResolution: Record<string, string>;
}
/**
 * Maximum total questions to ask before terminating.
 * This is the hard cap for the erotetic loop.
 */
export declare const MAX_QUESTIONS_TOTAL = 4;
/**
 * Detect if the user's response indicates they want to use defaults.
 *
 * @param response - The user's response text
 * @returns true if user wants to use defaults
 */
export declare function detectDefaultsIntent(response: string): boolean;
/**
 * Apply default values to unresolved Q-heuristics.
 * Creates a new object with resolved values plus defaults.
 *
 * @param resolved - Already resolved Q-heuristic answers
 * @param unresolved - Q-heuristics that need default values
 * @returns New object with all values (resolved + defaults)
 */
export declare function applyDefaults(resolved: Record<string, string>, unresolved: QHeuristic[]): Record<string, string>;
/**
 * Check if the erotetic loop should terminate.
 *
 * Priority order:
 * 1. All resolved -> terminate with 'all_resolved'
 * 2. User requested defaults -> terminate with 'defaults_requested'
 * 3. Max questions hit -> terminate with 'max_questions'
 * 4. Otherwise -> continue asking
 *
 * @param state - Current termination state
 * @returns Termination result with reason and final resolution
 */
export declare function checkTermination(state: TerminationState): TerminationResult;
