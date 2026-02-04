/**
 * Erotetic Question Framework - Phase 8 of Self-Improving Skill System
 *
 * Erotetic logic = question-based resolution. When a novel task is detected,
 * we ask clarifying questions until the task is unambiguous.
 *
 * This module provides:
 * - Q-heuristic definitions per task type (implementation, debug, research, planning)
 * - Context resolution to infer answers from prompts
 * - AskUserQuestion-compatible formatting (max 4 questions)
 *
 * Plan reference: thoughts/shared/plans/self-improving-skill-system.md (Phase 8)
 */
/**
 * Option for a Q-heuristic question.
 */
export interface QHeuristicOption {
    /** Short label for the option */
    label: string;
    /** Description of what this option means */
    description: string;
}
/**
 * Q-heuristic: A clarifying question to ask before task execution.
 * Named after erotetic logic (logic of questions and answers).
 */
export interface QHeuristic {
    /** Unique identifier for this question */
    id: string;
    /** The question to ask the user */
    question: string;
    /** Available options for the answer */
    options: QHeuristicOption[];
    /** Default value if user skips (if has default, can skip) */
    default?: string;
    /** Pattern to match in prompt for auto-inference (e.g., "jwt|oauth|api.?key") */
    inferFrom?: string;
}
/**
 * Q-heuristics organized by task type.
 */
export interface TaskQHeuristics {
    implementation: QHeuristic[];
    debug: QHeuristic[];
    research: QHeuristic[];
    planning: QHeuristic[];
}
/**
 * Result of context resolution.
 * Shows which questions were answered from context and which still need asking.
 */
export interface ContextResolutionResult {
    /** Questions that were resolved from the prompt */
    resolved: Record<string, string>;
    /** Questions that still need to be asked */
    unresolved: QHeuristic[];
}
/**
 * Single question in AskUserQuestion format.
 */
export interface FormattedQuestion {
    /** Question ID for tracking */
    id: string;
    /** The question text */
    question: string;
    /** Available options */
    options: Array<{
        label: string;
        description: string;
    }>;
    /** Whether this question can be skipped */
    optional: boolean;
    /** Default value if skipped */
    defaultValue?: string;
}
/**
 * Format compatible with Claude's AskUserQuestion tool.
 */
export interface AskUserQuestionFormat {
    /** Array of questions (max 4 per tool limit) */
    questions: FormattedQuestion[];
    /** Context message explaining why we're asking */
    context: string;
}
/**
 * Maximum number of questions per AskUserQuestion tool call.
 * This is a hard limit from the Claude tool specification.
 */
export declare const MAX_QUESTIONS = 4;
/**
 * Get Q-heuristics for a given task type.
 *
 * @param taskType - The type of task ('implementation', 'debug', 'research', 'planning')
 * @returns Array of Q-heuristics for this task type, or empty array for unknown types
 */
export declare function getQHeuristicsForTask(taskType: string): QHeuristic[];
/**
 * Try to resolve Q-heuristics from the user's prompt.
 * Uses inferFrom patterns to detect answers in the prompt text.
 *
 * @param prompt - The user's original prompt
 * @param qHeuristics - Q-heuristics to try to resolve
 * @returns Object with resolved answers and unresolved questions
 */
export declare function resolveFromContext(prompt: string, qHeuristics: QHeuristic[]): ContextResolutionResult;
/**
 * Format unresolved Q-heuristics for Claude's AskUserQuestion tool.
 * Limits output to MAX_QUESTIONS (4) per the tool's specification.
 *
 * @param unresolved - Array of Q-heuristics that need user input
 * @returns AskUserQuestion-compatible format
 */
export declare function formatAskUserQuestions(unresolved: QHeuristic[]): AskUserQuestionFormat;
